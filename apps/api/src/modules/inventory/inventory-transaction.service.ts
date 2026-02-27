import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InventoryChangeType } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InventoryTransactionInput,
  TransactionResult,
} from './dto/inventory.dto.js';

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
      minStock,
      allowNegativeStock = false,
    } = input;

    return await this.prisma.$transaction(
      async (tx) => {
        // 1️⃣ Upsert inventory (schema-safe)
        const inventory = await tx.inventory.upsert({
          where: {
            branchId_productId: { branchId, productId },
          },
          create: {
            tenantId,
            branchId,
            productId,
            stock: 0,
            minStock: 0,
          },
          update: {},
          select: {
            id: true,
            stock: true,
            minStock: true,
          },
        });

        const beforeStock = Number(inventory.stock);
        const beforeMinStock = Number(inventory.minStock);

        const { afterStock, adjustment, afterMinStock } =
          this.calculateStockChange(
            beforeStock,
            beforeMinStock,
            quantity,
            changeType,
            minStock,
          );

        // Allow negative stock for SALE transactions when explicitly permitted
        if (afterStock < 0 && !allowNegativeStock) {
          throw new BadRequestException(
            `Insufficient stock (${beforeStock} available)`,
          );
        }

        // 2️⃣ Update inventory table
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            stock: new Prisma.Decimal(afterStock),
            ...(afterMinStock !== undefined && {
              minStock: new Prisma.Decimal(afterMinStock),
            }),
          },
        });

        this.logger.debug(
          `Inventory updated: ${productId} | ${changeType} | ${beforeStock} → ${afterStock}`,
        );

        // 3️⃣ InventoryHistory (authoritative)
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
            ...(afterMinStock !== undefined && {
              beforeMinStock: new Prisma.Decimal(beforeMinStock),
              afterMinStock: new Prisma.Decimal(afterMinStock),
            }),
            reason: this.buildReason(reason, referenceType, referenceId),
            ...(referenceId && { referenceId }),
            ...(referenceType && { referenceType }),
          },
        });

        return {
          inventoryId: inventory.id,
          beforeStock,
          afterStock,
          afterMinStock:
            afterMinStock !== undefined ? afterMinStock : beforeMinStock,
          adjustment,
          historyId: historyRecord.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 8000,
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
      fromInput.changeType !== 'TRANSFER_OUT' ||
      toInput.changeType !== 'TRANSFER_IN'
    ) {
      throw new BadRequestException(
        'Transfer requires TRANSFER_OUT for source and TRANSFER_IN for destination',
      );
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
  async executeTransactionInTx(
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
        ...(referenceId && { referenceId }),
        ...(referenceType && { referenceType }),
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

      case 'ORDER_DEDUCTION':
      case 'SALE':
      case 'TRANSFER_OUT':
        // Subtract from stock (quantity is positive, we subtract it)
        afterStock = beforeStock - quantity;
        adjustment = -quantity;
        break;

      case 'REFUND':
      case 'TRANSFER_IN':
      case 'PURCHASE_ORDER_RECEIVE':
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
