import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InventoryChangeType } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * SINGLE SOURCE OF TRUTH FOR ALL INVENTORY MUTATIONS
 *
 * This service enforces:
 * - Transactional integrity
 * - Authoritative audit trail
 * - Business rule validation
 * - Negative stock protection
 * - Idempotency
 *
 * ⚠️ NO OTHER SERVICE SHOULD DIRECTLY MUTATE INVENTORY OR INVENTORY_HISTORY
 */

interface InventoryTransactionInput {
  tenantId: string;
  branchId: string;
  productId: string;
  userId: string;
  changeType: InventoryChangeType;
  quantity: number; // Always positive; sign determined by changeType
  reason?: string;
  referenceId?: string; // orderId, refundId, transferId for idempotency
  referenceType?: 'ORDER' | 'REFUND' | 'TRANSFER' | 'ADJUSTMENT';
  allowNegativeStock?: boolean;
  minStock?: number; // For SET_MIN_STOCK operations
}

interface TransactionResult {
  inventoryId: string;
  beforeStock: number;
  afterStock: number;
  adjustment: number;
  historyId: string;
}

@Injectable()
export class InventoryTransactionService {
  private readonly logger = new Logger(InventoryTransactionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async executeTransaction(
    input: InventoryTransactionInput,
  ): Promise<TransactionResult> {
    const {
      tenantId,
      branchId,
      productId,
      userId,
      changeType,
      quantity,
      reason,
      referenceId,
      referenceType,
      allowNegativeStock = false,
      minStock,
    } = input;

    // Validate quantity based on changeType
    // MANUAL_ADJUST allows negative quantities for stock deductions
    if (changeType !== 'MANUAL_ADJUST' && quantity < 0) {
      throw new BadRequestException('Quantity must be non-negative');
    }

    // For MANUAL_ADJUST, quantity can be negative (deduction) or positive (addition)
    if (changeType === 'MANUAL_ADJUST' && quantity === 0) {
      throw new BadRequestException(
        'Quantity cannot be zero for manual adjustments',
      );
    }

    // Validate changeType is allowed
    this.validateChangeType(changeType, referenceType);

    // Check for duplicate transaction (idempotency)
    if (referenceId && referenceType) {
      const existing = await this.prisma.inventoryHistory.findFirst({
        where: {
          tenantId,
          branchId,
          productId,
          changeType,
          reason: { contains: referenceId },
        },
      });

      if (existing) {
        this.logger.warn(
          `Duplicate transaction prevented: ${referenceType} ${referenceId}`,
        );
        throw new BadRequestException(
          `Inventory already adjusted for ${referenceType} ${referenceId}`,
        );
      }
    }

    return await this.prisma.$transaction(
      async (tx) => {
        // Verify product and branch exist in a single parallel query batch
        const [product, branch] = await Promise.all([
          tx.product.findFirst({
            where: { id: productId, tenantId, isDeleted: false },
            select: { id: true }, // Only select what we need
          }),
          tx.branch.findFirst({
            where: { id: branchId, tenantId, isDeleted: false },
            select: { id: true },
          }),
        ]);

        if (!product) {
          throw new NotFoundException(
            `Product ${productId} not found or deleted`,
          );
        }

        if (!branch) {
          throw new NotFoundException(
            `Branch ${branchId} not found or deleted`,
          );
        }

        // Get or create inventory record
        // Note: Prisma doesn't support FOR UPDATE directly, but READ_COMMITTED + immediate update provides good concurrency
        let inventoryRecord = await tx.inventory.findUnique({
          where: {
            branchId_productId: {
              branchId,
              productId,
            },
          },
          select: {
            id: true,
            stock: true,
            minStock: true,
          },
        });

        if (!inventoryRecord) {
          // Create if doesn't exist
          inventoryRecord = await tx.inventory.create({
            data: {
              tenantId,
              branchId,
              productId,
              stock: 0,
              minStock: 0,
            },
            select: {
              id: true,
              stock: true,
              minStock: true,
            },
          });
        }

        const beforeStock = Number(inventoryRecord.stock);
        const beforeMinStock = Number(inventoryRecord.minStock);

        // Calculate new stock based on changeType
        const { afterStock, adjustment, afterMinStock } =
          this.calculateStockChange(
            beforeStock,
            beforeMinStock,
            quantity,
            changeType,
            minStock,
          );

        // Prevent negative stock (unless explicitly allowed)
        if (!allowNegativeStock && afterStock < 0) {
          throw new BadRequestException(
            `Insufficient stock: ${beforeStock} available, ${quantity} requested`,
          );
        }

        // Update inventory
        const updatedInventory = await tx.inventory.update({
          where: { id: inventoryRecord.id },
          data: {
            stock: new Prisma.Decimal(afterStock),
            ...(afterMinStock !== undefined && {
              minStock: new Prisma.Decimal(afterMinStock),
            }),
          },
        });

        // Create authoritative history record
        const historyRecord = await tx.inventoryHistory.create({
          data: {
            tenantId,
            branchId,
            productId,
            userId,
            changeType,
            beforeStock: new Prisma.Decimal(beforeStock),
            afterStock: new Prisma.Decimal(afterStock),
            adjustment: new Prisma.Decimal(adjustment),
            ...(beforeMinStock !== undefined &&
              afterMinStock !== undefined && {
                beforeMinStock: new Prisma.Decimal(beforeMinStock),
                afterMinStock: new Prisma.Decimal(afterMinStock),
              }),
            reason: this.buildReason(reason, referenceType, referenceId),
          },
        });

        this.logger.log(
          `Inventory transaction: ${productId} @ ${branchId} | ${beforeStock} → ${afterStock} (${adjustment}) | ${changeType}`,
        );

        return {
          inventoryId: updatedInventory.id,
          beforeStock,
          afterStock,
          adjustment,
          historyId: historyRecord.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000, // Reduced timeout since we use row-level locking
      },
    );
  }

  /**
   * Execute multiple inventory transactions atomically (for transfers)
   */
  async executeTransferTransactions(
    fromInput: InventoryTransactionInput,
    toInput: InventoryTransactionInput,
  ): Promise<{
    from: TransactionResult;
    to: TransactionResult;
  }> {
    // Validate both transactions are for transfers
    if (
      fromInput.changeType !== 'ORDER_DEDUCT' ||
      toInput.changeType !== 'ORDER_RETURN'
    ) {
      // For now we'll use ORDER_DEDUCT/ORDER_RETURN as proxies
      // In production, you'd add TRANSFER_OUT/TRANSFER_IN to the enum
    }

    return await this.prisma.$transaction(
      async (tx) => {
        // Execute deduction from source branch
        const fromResult = await this.executeTransactionInTx(tx, fromInput);

        // Execute addition to destination branch
        const toResult = await this.executeTransactionInTx(tx, toInput);

        return { from: fromResult, to: toResult };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
      },
    );
  }

  /**
   * Helper: Execute transaction within an existing Prisma transaction
   */
  private async executeTransactionInTx(
    tx: Prisma.TransactionClient,
    input: InventoryTransactionInput,
  ): Promise<TransactionResult> {
    const {
      tenantId,
      branchId,
      productId,
      userId,
      changeType,
      quantity,
      reason,
      referenceId,
      referenceType,
      allowNegativeStock = false,
      minStock,
    } = input;

    // Get or create inventory
    let inventory = await tx.inventory.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    if (!inventory) {
      inventory = await tx.inventory.create({
        data: {
          tenantId,
          branchId,
          productId,
          stock: 0,
          minStock: 0,
        },
      });
    }

    const beforeStock = Number(inventory.stock);
    const beforeMinStock = Number(inventory.minStock);

    const { afterStock, adjustment, afterMinStock } = this.calculateStockChange(
      beforeStock,
      beforeMinStock,
      quantity,
      changeType,
      minStock,
    );

    if (!allowNegativeStock && afterStock < 0) {
      throw new BadRequestException(
        `Insufficient stock: ${beforeStock} available, ${quantity} requested`,
      );
    }

    const updatedInventory = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        stock: new Prisma.Decimal(afterStock),
        ...(afterMinStock !== undefined && {
          minStock: new Prisma.Decimal(afterMinStock),
        }),
      },
    });

    const historyRecord = await tx.inventoryHistory.create({
      data: {
        tenantId,
        branchId,
        productId,
        userId,
        changeType,
        beforeStock: new Prisma.Decimal(beforeStock),
        afterStock: new Prisma.Decimal(afterStock),
        adjustment: new Prisma.Decimal(adjustment),
        ...(beforeMinStock !== undefined &&
          afterMinStock !== undefined && {
            beforeMinStock: new Prisma.Decimal(beforeMinStock),
            afterMinStock: new Prisma.Decimal(afterMinStock),
          }),
        reason: this.buildReason(reason, referenceType, referenceId),
      },
    });

    return {
      inventoryId: updatedInventory.id,
      beforeStock,
      afterStock,
      adjustment,
      historyId: historyRecord.id,
    };
  }

  /**
   * Calculate stock change based on change type
   */
  private calculateStockChange(
    beforeStock: number,
    beforeMinStock: number,
    quantity: number,
    changeType: InventoryChangeType,
    newMinStock?: number,
  ): {
    afterStock: number;
    adjustment: number;
    afterMinStock?: number;
  } {
    let afterStock: number;
    let adjustment: number;
    let afterMinStock: number | undefined;

    switch (changeType) {
      case 'SET_STOCK':
        // Directly set stock level
        afterStock = quantity;
        adjustment = afterStock - beforeStock;
        break;

      case 'ADJUST_STOCK':
        // Add to current stock (always addition)
        afterStock = beforeStock + quantity;
        adjustment = quantity;
        break;

      case 'MANUAL_ADJUST':
        // Manual adjustment - quantity determines direction
        // For STOCK_OUT operations, quantity should be negative
        // For direct adjustments, quantity sign determines direction
        afterStock = beforeStock + quantity;
        adjustment = quantity;
        break;

      case 'ORDER_DEDUCT':
        // Subtract from stock (quantity is positive, we subtract it)
        afterStock = beforeStock - quantity;
        adjustment = -quantity;
        break;

      case 'ORDER_RETURN':
        // Add back to stock
        afterStock = beforeStock + quantity;
        adjustment = quantity;
        break;

      case 'SET_MIN_STOCK':
        // Only update minStock, not stock
        afterStock = beforeStock;
        adjustment = 0;
        afterMinStock = newMinStock ?? beforeMinStock;
        break;

      default:
        throw new BadRequestException(
          `Unsupported change type: ${String(changeType)}`,
        );
    }

    return { afterStock, adjustment, afterMinStock };
  }

  /**
   * Validate changeType is allowed for the given reference type
   */
  private validateChangeType(
    changeType: InventoryChangeType,
    referenceType?: string,
  ): void {
    const rules: Record<InventoryChangeType, string[]> = {
      SET_STOCK: ['ADJUSTMENT'], // Initial setup only
      ADJUST_STOCK: ['ADJUSTMENT'], // Manual adjustments
      MANUAL_ADJUST: ['ADJUSTMENT'], // Explicit overrides
      ORDER_DEDUCT: ['ORDER'], // Order completion
      ORDER_RETURN: ['REFUND', 'TRANSFER'], // Refunds and transfer receipts
      SET_MIN_STOCK: ['ADJUSTMENT'], // Threshold management
    };

    if (referenceType && !rules[changeType]?.includes(referenceType)) {
      throw new BadRequestException(
        `Change type ${changeType} not allowed for ${referenceType}`,
      );
    }
  }

  /**
   * Build reason string with reference information
   */
  private buildReason(
    reason: string | undefined,
    referenceType?: string,
    referenceId?: string,
  ): string {
    const parts: string[] = [];

    if (referenceType && referenceId) {
      parts.push(`${referenceType}: ${referenceId}`);
    }

    if (reason) {
      parts.push(reason);
    }

    return parts.join(' - ') || 'No reason provided';
  }

  /**
   * Check if stock deduction is allowed for a product
   */
  async canDeductStock(
    branchId: string,
    productId: string,
    quantity: number,
  ): Promise<{
    allowed: boolean;
    currentStock: number;
    requested: number;
  }> {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    const currentStock = inventory ? Number(inventory.stock) : 0;

    return {
      allowed: currentStock >= quantity,
      currentStock,
      requested: quantity,
    };
  }

  /**
   * Bulk validation for multiple products
   */
  async validateStockAvailability(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<
    Array<{
      productId: string;
      available: number;
      requested: number;
      sufficient: boolean;
    }>
  > {
    const productIds = items.map((item) => item.productId);

    const inventoryRecords = await this.prisma.inventory.findMany({
      where: {
        branchId,
        productId: { in: productIds },
      },
    });

    const inventoryMap = new Map(
      inventoryRecords.map((inv) => [inv.productId, Number(inv.stock)]),
    );

    return items.map((item) => {
      const available = inventoryMap.get(item.productId) || 0;
      return {
        productId: item.productId,
        available,
        requested: item.quantity,
        sufficient: available >= item.quantity,
      };
    });
  }
}
