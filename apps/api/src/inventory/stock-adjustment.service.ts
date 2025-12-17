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
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class StockAdjustmentService {
  constructor(private prisma: PrismaService) {}
  /**
   * Adjust stock for a product at a branch
   * Supports ADD, REMOVE, and SET operations with reason tracking
   * Updates lastAdjusted timestamp automatically via Prisma @updatedAt
   * Creates audit trail in InventoryHistory
   */
  async adjustStock(
    tenantId: string,
    userId: string,
    adjustmentDto: CreateStockAdjustmentDto,
  ) {
    const { branchId, productId, operation, quantity, reason } = adjustmentDto;

    // Verify branch belongs to tenant
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Verify product belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get or create inventory record
    let inventory = await this.prisma.inventory.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    if (!inventory) {
      // Create inventory if it doesn't exist
      inventory = await this.prisma.inventory.create({
        data: {
          tenantId,
          branchId,
          productId,
          stock: 0,
          minStock: 0,
        },
      });
    }

    const stockBefore = Number(inventory.stock);
    let stockAfter: number;

    // Calculate new stock level based on operation type (matching Prisma InventoryChangeType)
    switch (operation) {
      case 'SET_STOCK':
        // Set stock to absolute value
        stockAfter = quantity;
        break;

      case 'ADJUST_STOCK':
        // Adjust stock by quantity (positive to add, negative to remove)
        stockAfter = stockBefore + quantity;
        break;

      case 'MANUAL_ADJUST':
        // Manual adjustment - set to absolute value
        stockAfter = quantity;
        break;

      default:
        throw new BadRequestException(
          `Invalid operation type. Use SET_STOCK, ADJUST_STOCK, or MANUAL_ADJUST`,
        );
    }

    // Validate stock doesn't go negative
    if (stockAfter < 0) {
      throw new BadRequestException(
        `Stock cannot be negative. Attempted: ${stockAfter}, Current stock: ${stockBefore}`,
      );
    }

    // Use the operation directly as InventoryChangeType
    const changeType = operation as InventoryChangeType;

    // Perform adjustment in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update inventory (lastAdjusted is auto-updated via @updatedAt)
      const updatedInventory = await tx.inventory.update({
        where: {
          branchId_productId: {
            branchId,
            productId,
          },
        },
        data: {
          stock: new Prisma.Decimal(stockAfter),
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

      // Create history record for audit trail
      // Tracks: user, timestamp, before/after quantities, and reason
      await tx.inventoryHistory.create({
        data: {
          tenantId,
          branchId,
          productId,
          userId,
          changeType,
          beforeStock: new Prisma.Decimal(stockBefore),
          afterStock: new Prisma.Decimal(stockAfter),
          adjustment: new Prisma.Decimal(stockAfter - stockBefore),
          reason,
        },
      });

      return updatedInventory;
    });

    return {
      message: 'Stock adjusted successfully',
      inventory: {
        id: result.id,
        stock: Number(result.stock),
        minStock: Number(result.minStock),
        lastAdjusted: result.lastAdjusted,
        product: result.product,
        branch: result.branch,
      },
      adjustment: {
        operation,
        changeType,
        quantity,
        stockBefore,
        stockAfter,
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
              email: true,
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
              email: true;
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
              email: true,
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
