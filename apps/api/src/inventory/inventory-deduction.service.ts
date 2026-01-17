import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrderItem, OrderStatus } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryTransactionService } from './inventory-transaction.service.js';
import type {
  StockDeductionItem,
  StockValidationResult,
  StockWarningInfo,
} from './dto/stock-adjustment.dto.js';

@Injectable()
export class InventoryDeductionService {
  private readonly logger = new Logger(InventoryDeductionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}
  /**
   * Validate and deduct stock when order is COMPLETED
   * Handles both direct products and recipe-based ingredient deduction
   * Implements idempotency to prevent double-deduction
   *
   * ⚠️ IMPORTANT: This method ALLOWS negative stock for SALE transactions.
   * Orders should NOT be blocked due to insufficient stock - cashiers are warned
   * during the cart-building phase, and the business decision is to proceed.
   */
  async deductStockForOrder(
    tenantId: string,
    orderId: string,
    branchId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    deductionsApplied: number;
    stockWarnings: StockWarningInfo[];
  }> {
    // Get order with items and product details (including recipes for ingredient deduction)
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        branchId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                recipesUsedIn: true,
                inventory: true, // Include inventory to calculate ingredient deductions
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    this.logger.log(
      `📦 Starting inventory deduction for order ${orderId} (${order.items.length} items)`,
    );

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Order already completed - stock already deducted',
      );
    }

    // Calculate all stock deductions needed (pass full items with product data)
    const orderItems = order.items as unknown as OrderItem[];
    const deductions = this.calculateStockDeductions(orderItems);

    // Check stock availability (for warnings only - does NOT block)
    const stockCheck = await this.checkStockAvailability(
      tenantId,
      branchId,
      deductions,
    );

    // Log warnings for items that will go negative (informational only)
    if (stockCheck.insufficientItems.length > 0) {
      this.logger.warn(
        `⚠️ Order ${orderId} will result in negative stock for ${stockCheck.insufficientItems.length} item(s)`,
      );
      for (const item of stockCheck.insufficientItems) {
        this.logger.warn(
          `  - ${item.productName}: ${item.available} available, ${item.required} required → ${item.available - item.required} after sale`,
        );
      }
    }

    // Execute deductions atomically with audit trail (allows negative stock)
    const stockWarnings = await this.executeStockDeductions(
      tenantId,
      branchId,
      deductions,
      orderId,
      userId,
      true, // allowNegativeStock = true for SALE transactions
    );

    this.logger.log(
      `Stock deducted for order ${orderId}: ${deductions.length} products/ingredients`,
    );

    return {
      success: true,
      deductionsApplied: deductions.length,
      stockWarnings,
    };
  }

  /**
   * Calculate stock deductions from order items
   * For products with recipes, calculate ingredient requirements
   */
  private calculateStockDeductions(
    orderItems: OrderItem[],
  ): StockDeductionItem[] {
    const deductions = new Map<string, StockDeductionItem>();

    for (const item of orderItems) {
      const orderQty = Number(item.quantity);
      const product = item.product;

      // Skip items with missing products (deleted or orphaned)
      if (!product) {
        this.logger.warn(
          `Skipping order item ${item.id}: product not found (may be deleted)`,
        );
        continue;
      }

      // Check if product has recipes (is a finished product made from ingredients)
      if (product?.recipesUsedIn && product?.recipesUsedIn.length > 0) {
        // Recipe-based product: deduct ingredients
        for (const recipe of product.recipesUsedIn) {
          const ingredient = recipe.ingredient;
          const ingredientId = String(recipe.ingredientId);
          const requiredQty = Number(recipe.quantity) * orderQty;

          const existing = deductions.get(ingredientId);
          if (existing) {
            existing.quantity += requiredQty;
          } else {
            deductions.set(ingredientId, {
              productId: ingredientId,
              productName: ingredient?.name ?? '',
              quantity: requiredQty,
              orderItemId: item.id,
            });
          }
        }
      } else {
        // Simple product: deduct directly
        const existing = deductions.get(String(product.id));
        if (existing) {
          existing.quantity += orderQty;
        } else {
          deductions.set(String(product.id), {
            productId: String(product.id),
            productName: String(product.name),
            quantity: orderQty,
            orderItemId: item.id,
          });
        }
      }
    }

    return Array.from(deductions.values());
  }

  /**
   * Validate that sufficient stock exists for all deductions
   * @deprecated Use checkStockAvailability for non-blocking validation
   */
  private async validateStockAvailability(
    tenantId: string,
    branchId: string,
    deductions: StockDeductionItem[],
  ): Promise<StockValidationResult> {
    const productIds = deductions.map((d) => d.productId);

    const inventoryRecords = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        branchId,
        productId: { in: productIds },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            isIngredient: true,
          },
        },
      },
    });

    const inventoryMap = new Map(
      inventoryRecords.map((inv) => [inv.productId, inv]),
    );

    const insufficientStock: StockValidationResult['insufficientStock'] = [];

    for (const deduction of deductions) {
      const inventory = inventoryMap.get(deduction.productId);
      const available = inventory ? Number(inventory.stock) : 0;

      if (available < deduction.quantity) {
        const product =
          inventory?.product ||
          (await this.prisma.product.findUnique({
            where: { id: deduction.productId },
            select: { name: true, isIngredient: true },
          }));

        insufficientStock.push({
          productId: String(deduction.productId),
          productName: String(product?.name),
          ...(product?.isIngredient && {
            ingredientId: String(deduction.productId),
            ingredientName: String(product.name),
          }),
          required: deduction.quantity,
          available,
        });
      }
    }

    return {
      isValid: insufficientStock.length === 0,
      insufficientStock,
    };
  }

  /**
   * Check stock availability (non-blocking - returns warnings only)
   * Used to log and inform about items that will go negative
   */
  private async checkStockAvailability(
    tenantId: string,
    branchId: string,
    deductions: StockDeductionItem[],
  ): Promise<{
    insufficientItems: Array<{
      productId: string;
      productName: string;
      ingredientId?: string;
      ingredientName?: string;
      required: number;
      available: number;
    }>;
  }> {
    const productIds = deductions.map((d) => d.productId);

    const inventoryRecords = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        branchId,
        productId: { in: productIds },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            isIngredient: true,
          },
        },
      },
    });

    const inventoryMap = new Map(
      inventoryRecords.map((inv) => [inv.productId, inv]),
    );

    const insufficientItems: Array<{
      productId: string;
      productName: string;
      ingredientId?: string;
      ingredientName?: string;
      required: number;
      available: number;
    }> = [];

    for (const deduction of deductions) {
      const inventory = inventoryMap.get(deduction.productId);
      const available = inventory ? Number(inventory.stock) : 0;

      if (available < deduction.quantity) {
        const product =
          inventory?.product ||
          (await this.prisma.product.findUnique({
            where: { id: deduction.productId },
            select: { name: true, isIngredient: true },
          }));

        insufficientItems.push({
          productId: String(deduction.productId),
          productName: String(product?.name),
          ...(product?.isIngredient && {
            ingredientId: String(deduction.productId),
            ingredientName: String(product.name),
          }),
          required: deduction.quantity,
          available,
        });
      }
    }

    return { insufficientItems };
  }

  /**
   * Execute stock deductions atomically with audit trail
   * Now uses InventoryTransactionService for consistency
   *
   * @param allowNegativeStock - When true, allows stock to go negative (for SALE transactions)
   * @returns Array of stock warnings for items that went negative
   */
  private async executeStockDeductions(
    tenantId: string,
    branchId: string,
    deductions: StockDeductionItem[],
    orderId?: string,
    userId?: string,
    allowNegativeStock = false,
  ): Promise<StockWarningInfo[]> {
    if (!userId) {
      throw new BadRequestException(
        'userId is required for inventory transactions',
      );
    }

    const stockWarnings: StockWarningInfo[] = [];

    // Get order number for better history tracking
    let orderNumber: string | undefined;
    if (orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true },
      });
      orderNumber = order?.orderNumber ?? undefined;
    }

    // Execute all deductions through centralized transaction service
    for (const deduction of deductions) {
      const reason = orderNumber
        ? `${deduction.productName} removed for Order ${orderNumber}`
        : `${deduction.productName} removed for Order #${orderId}`;

      const result = await this.inventoryTransactionService.executeTransaction({
        tenantId,
        branchId,
        productId: deduction.productId,
        userId,
        changeType: 'SALE',
        quantity: deduction.quantity,
        reason,
        referenceId: orderId,
        referenceType: 'ORDER',
        allowNegativeStock,
      });

      // Track items that went negative
      if (result.afterStock < 0) {
        stockWarnings.push({
          productId: deduction.productId,
          productName: deduction.productName,
          quantityDeducted: deduction.quantity,
          stockBefore: result.beforeStock,
          stockAfter: result.afterStock,
        });

        this.logger.warn(
          `⚠️ Stock went negative: ${deduction.productName} (${result.beforeStock} → ${result.afterStock}) | Order ${orderNumber || orderId}`,
        );
      }

      this.logger.log(
        `📉 Stock removed: ${deduction.productName} (-${deduction.quantity}) | Order ${orderNumber || orderId}`,
      );
    }

    this.logger.log(
      `✅ Completed inventory deduction: ${deductions.length} items removed for order ${orderNumber || orderId}`,
    );

    return stockWarnings;
  }

  /**
   * Preview stock deductions without executing them
   * Useful for order validation before completion
   */
  async previewStockDeductions(
    tenantId: string,
    branchId: string,
    items: Array<{ productId: string; quantity: number }>,
  ) {
    // Get products with recipes
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: items.map((i) => i.productId) },
        tenantId,
      },
      include: {
        recipesUsedIn: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                sku: true,
                isIngredient: true,
              },
            },
          },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate deductions
    type DeductionItem = {
      productId: string;
      productName: string;
      sku: string | null;
      isIngredient: boolean;
      quantity: number;
      source: 'direct' | 'recipe';
      fromProduct?: string;
    };

    const deductions = new Map<string, DeductionItem>();

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const orderQty = item.quantity;

      if (product.recipesUsedIn && product.recipesUsedIn.length > 0) {
        // Recipe-based
        for (const recipe of product.recipesUsedIn) {
          const ingredientId = recipe.ingredientId;
          const requiredQty = Number(recipe.quantity) * orderQty;

          const existing = deductions.get(ingredientId);
          if (existing) {
            existing.quantity += requiredQty;
          } else {
            deductions.set(ingredientId, {
              productId: ingredientId,
              productName: recipe.ingredient.name,
              sku: recipe.ingredient.sku,
              isIngredient: true,
              quantity: requiredQty,
              source: 'recipe',
              fromProduct: product.name,
            });
          }
        }
      } else {
        // Direct deduction
        const existing = deductions.get(product.id);
        if (existing) {
          existing.quantity += orderQty;
        } else {
          deductions.set(String(product.id), {
            productId: String(product.id),
            productName: String(product.name),
            sku: String(product.sku),
            isIngredient: product.isIngredient,
            quantity: orderQty,
            source: 'direct',
          });
        }
      }
    }

    // Get current stock levels
    const deductionList = Array.from(deductions.values());
    const productIds = deductionList.map((d) => String(d.productId));

    const inventoryRecords = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        branchId,
        productId: { in: productIds },
      },
    });

    const inventoryMap = new Map(
      inventoryRecords.map((inv) => [inv.productId, inv]),
    );

    // Add stock info to deductions
    const preview = deductionList.map((deduction) => {
      const inventory = inventoryMap.get(String(deduction.productId));
      const currentStock = inventory ? Number(inventory.stock) : 0;
      const afterDeduction = currentStock - deduction.quantity;

      return {
        ...deduction,
        currentStock,
        afterDeduction,
        hasSufficientStock: afterDeduction >= 0,
      };
    });

    return {
      deductions: preview,
      allAvailable: preview.every((d) => d.hasSufficientStock),
    };
  }
}
