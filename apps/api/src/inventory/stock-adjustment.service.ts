import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type {
  CreateStockAdjustmentDto,
  StockAdjustmentHistoryQueryDto,
} from './dto/stock-adjustment.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryChangeType } from '@repo/types';
import { InventoryTransactionService } from './inventory-transaction.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class StockAdjustmentService {
  constructor(
    private prisma: PrismaService,
    private inventoryTransactionService: InventoryTransactionService,
  ) {}
  /**
   * Adjust stock for a product at a branch
   * Now uses InventoryTransactionService as single source of truth
   * Supports STOCK_IN, STOCK_OUT, and SET_STOCK operations
   */
  async adjustStock(
    tenantId: string,
    userId: string,
    adjustmentDto: CreateStockAdjustmentDto,
  ) {
    const { branchId, productId, adjustmentType, quantity, reason, minStock } =
      adjustmentDto;

    // Validate quantity is positive
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive number');
    }

    // Map adjustment type to change type
    let changeType: InventoryChangeType;
    let transactionQuantity: number;

    switch (adjustmentType) {
      case 'STOCK_IN':
        changeType = 'ADJUST_STOCK';
        transactionQuantity = quantity; // Positive: add to stock
        break;

      case 'STOCK_OUT':
        changeType = 'MANUAL_ADJUST';
        transactionQuantity = -Math.abs(quantity); // Negative: subtract from stock
        break;

      case 'SET_STOCK':
        changeType = 'SET_STOCK';
        transactionQuantity = quantity; // Set absolute value
        break;

      default:
        throw new BadRequestException(
          `Invalid adjustment type. Use STOCK_IN, STOCK_OUT, or SET_STOCK`,
        );
    }

    // Execute transaction through centralized service
    const result = await this.inventoryTransactionService.executeTransaction({
      tenantId,
      branchId,
      productId,
      userId,
      changeType,
      quantity: transactionQuantity,
      reason: reason || `${adjustmentType} adjustment`,
      referenceType: 'ADJUSTMENT',
      allowNegativeStock: false, // Strict: never allow negative stock
    });

    // Handle minStock update separately if provided
    if (minStock !== undefined) {
      await this.inventoryTransactionService.executeTransaction({
        tenantId,
        branchId,
        productId,
        userId,
        changeType: 'SET_MIN_STOCK',
        quantity: minStock,
        reason: 'Minimum stock threshold updated',
        referenceType: 'ADJUSTMENT',
        minStock,
      });
    }

    // Fetch updated inventory with relations
    const updatedInventory = await this.prisma.inventory.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: 'Stock adjusted successfully',
      inventory: {
        id: updatedInventory!.id,
        stock: Number(updatedInventory!.stock),
        minStock: Number(updatedInventory!.minStock),
        lastAdjusted: updatedInventory!.lastAdjusted,
        product: updatedInventory!.product,
        branch: updatedInventory!.branch,
      },
      adjustment: {
        adjustmentType,
        changeType,
        quantity,
        stockBefore: result.beforeStock,
        stockAfter: result.afterStock,
        reason,
      },
    };
  }

  /**
   * Get adjustment history with filters
   * Returns audit trail with user, timestamp, before/after quantities, and reason
   */
  async getAdjustmentHistory(
    tenantId: string,
    queryDto: StockAdjustmentHistoryQueryDto,
  ) {
    const {
      page = 1,
      limit = 20,
      branchId,
      productId,
      changeType,
      startDate,
      endDate,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.InventoryHistoryWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(productId && { productId }),
      ...(changeType && { changeType }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const [totalCount, adjustments] = (await Promise.all([
      this.prisma.inventoryHistory.count({ where }),
      this.prisma.inventoryHistory.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ])) as [
      number,
      Prisma.InventoryHistoryGetPayload<{
        include: {
          product: {
            select: {
              id: true;
              name: true;
              sku: true;
            };
          };
          branch: {
            select: {
              id: true;
              name: true;
            };
          };
          user: {
            select: {
              id: true;
              name: true;
              username: true;
            };
          };
        };
      }>[],
    ];

    return {
      data: adjustments.map((adj) => ({
        id: adj.id,
        changeType: adj.changeType,
        beforeStock: Number(adj.beforeStock),
        afterStock: Number(adj.afterStock),
        adjustment: Number(adj.adjustment),
        beforeMinStock: adj.beforeMinStock ? Number(adj.beforeMinStock) : null,
        afterMinStock: adj.afterMinStock ? Number(adj.afterMinStock) : null,
        reason: adj.reason,
        createdAt: adj.createdAt,
        product: adj.product,
        branch: adj.branch,
        user: adj.user,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get adjustment history for a specific inventory item
   */
  async getInventoryAdjustmentHistory(
    tenantId: string,
    branchId: string,
    productId: string,
    page = 1,
    limit = 20,
  ) {
    // Verify inventory exists and belongs to tenant
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        branchId,
        productId,
        tenantId,
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const skip = (page - 1) * limit;

    const [totalCount, adjustments] = await Promise.all([
      this.prisma.inventoryHistory.count({
        where: {
          branchId,
          productId,
        },
      }),
      this.prisma.inventoryHistory.findMany({
        where: {
          branchId,
          productId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: adjustments.map((adj) => ({
        id: adj.id,
        changeType: adj.changeType,
        beforeStock: Number(adj.beforeStock),
        afterStock: Number(adj.afterStock),
        adjustment: Number(adj.adjustment),
        beforeMinStock: adj.beforeMinStock ? Number(adj.beforeMinStock) : null,
        afterMinStock: adj.afterMinStock ? Number(adj.afterMinStock) : null,
        reason: adj.reason,
        createdAt: adj.createdAt,
        product: adj.product,
        branch: adj.branch,
        user: adj.user,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      inventory: {
        currentStock: Number(inventory.stock),
        minStock: Number(inventory.minStock),
        lastAdjusted: inventory.lastAdjusted,
      },
    };
  }

  /**
   * Get adjustment summary statistics
   */
  async getAdjustmentSummary(
    tenantId: string,
    branchId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Prisma.InventoryHistoryWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const [totalAdjustments, adjustmentsByType] = await Promise.all([
      this.prisma.inventoryHistory.count({ where }),
      this.prisma.inventoryHistory.groupBy({
        by: ['changeType'],
        where,
        _count: {
          changeType: true,
        },
      }),
    ]);

    const summary = {
      totalAdjustments,
      byType: adjustmentsByType.reduce(
        (acc: Record<string, number>, item): Record<string, number> => {
          acc[item.changeType] = item._count.changeType;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    return summary;
  }
}
