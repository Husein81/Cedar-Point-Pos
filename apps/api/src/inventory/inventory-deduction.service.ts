import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, prisma, OrderStatus } from '@repo/db';
import type { OrderItem } from '@repo/types';

interface StockDeductionItem {
  productId: string;
  quantity: number;
  orderItemId?: string;
}

interface StockValidationResult {
  isValid: boolean;
  insufficientStock: Array<{
    productId: string;
    productName: string;
    ingredientId?: string;
    ingredientName?: string;
    required: number;
    available: number;
  }>;
}

@Injectable()
export class InventoryDeductionService {
  private readonly logger = new Logger(InventoryDeductionService.name);

  /**
   * Validate and deduct stock when order is completed
   * Handles both direct products and recipe-based ingredient deduction
   */
  async deductStockForOrder(
    tenantId: string,
    orderId: string,
    branchId: string,
  ) {
    // Get order with items
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        branchId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Order already completed - stock already deducted',
      );
    }

    // Calculate all stock deductions needed
    const items = order.items.map((item) => {
      return { productId: item.productId, quantity: Number(item.quantity) };
    }) as OrderItem[];

    const deductions = this.calculateStockDeductions(items);

    // Validate stock availability
    const validation = await this.validateStockAvailability(
      tenantId,
      branchId,
      deductions,
    );

    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Insufficient stock to complete order',
        insufficientStock: validation.insufficientStock,
      });
    }

    // Execute deductions atomically
    await this.executeStockDeductions(tenantId, branchId, deductions);

    this.logger.log(
      `Stock deducted for order ${orderId}: ${deductions.length} products/ingredients`,
    );

    return {
      success: true,
      deductionsApplied: deductions.length,
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

      // Check if product has recipes (is a finished product made from ingredients)
      if (product?.recipesUsedIn && product?.recipesUsedIn.length > 0) {
        // Recipe-based product: deduct ingredients
        for (const recipe of product.recipesUsedIn) {
          const ingredientId = String(recipe.ingredientId);
          const requiredQty = Number(recipe.quantity) * orderQty;

          const existing = deductions.get(ingredientId);
          if (existing) {
            existing.quantity += requiredQty;
          } else {
            deductions.set(ingredientId, {
              productId: ingredientId,
              quantity: requiredQty,
              orderItemId: item.id,
            });
          }
        }
      } else {
        // Simple product: deduct directly
        const existing = deductions.get(String(product?.id));
        if (existing) {
          existing.quantity += orderQty;
        } else {
          deductions.set(String(product?.id), {
            productId: String(product?.id),
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
   */
  private async validateStockAvailability(
    tenantId: string,
    branchId: string,
    deductions: StockDeductionItem[],
  ): Promise<StockValidationResult> {
    const productIds = deductions.map((d) => d.productId);

    const inventoryRecords = await prisma.inventory.findMany({
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
          (await prisma.product.findUnique({
            where: { id: deduction.productId },
            select: { name: true, isIngredient: true },
          }));

        insufficientStock.push({
          productId: deduction.productId,
          productName: product?.name || 'Unknown',
          ...(product?.isIngredient && {
            ingredientId: deduction.productId,
            ingredientName: product.name,
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
   * Execute stock deductions atomically
   */
  private async executeStockDeductions(
    tenantId: string,
    branchId: string,
    deductions: StockDeductionItem[],
  ) {
    await prisma.$transaction(async (tx) => {
      for (const deduction of deductions) {
        const inventory = await tx.inventory.findUnique({
          where: {
            branchId_productId: {
              branchId,
              productId: deduction.productId,
            },
          },
        });

        if (!inventory) {
          throw new BadRequestException(
            `Inventory record not found for product ${deduction.productId}`,
          );
        }

        // Deduct stock
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            stock: {
              decrement: new Prisma.Decimal(deduction.quantity),
            },
          },
        });
      }
    });
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
    const products = await prisma.product.findMany({
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
          deductions.set(product.id, {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
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

    const inventoryRecords = await prisma.inventory.findMany({
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
