/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma, Prisma } from '@repo/db';
import type {
  CreateStockAdjustmentDto,
  StockAdjustmentHistoryQueryDto,
} from './dto/stock-adjustment.dto';
import { AdjustmentType } from '@repo/types';

@Injectable()
export class StockAdjustmentService {
  /**
   * Adjust stock for a product at a branch
   * Supports ADD, REMOVE, and SET operations
   */
  async adjustStock(
    tenantId: string,
    userId: string,
    adjustmentDto: CreateStockAdjustmentDto,
  ): Promise<void> {
    const { branchId, productId, type, quantity, reason } = adjustmentDto;

    // Verify branch belongs to tenant
    const branch = await prisma.branch.findFirst({
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
    const product = await prisma.product.findFirst({
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
    let inventory = await prisma.inventory.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    if (!inventory) {
      // Create inventory if it doesn't exist
      inventory = await prisma.inventory.create({
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
    let quantityChange: number;

    // Calculate new stock level based on adjustment type
    switch (type) {
      case AdjustmentType.ADD:
        stockAfter = stockBefore + quantity;
        quantityChange = quantity;
        break;

      case AdjustmentType.REMOVE:
        if (quantity > stockBefore) {
          throw new BadRequestException(
            `Cannot remove ${quantity} units. Only ${stockBefore} units available in stock`,
          );
        }
        stockAfter = stockBefore - quantity;
        quantityChange = -quantity;
        break;

      case AdjustmentType.SET:
        stockAfter = quantity;
        quantityChange = quantity - stockBefore;
        break;

      default:
        throw new BadRequestException(`Invalid adjustment type: ${type}`);
    }

    // Validate stock doesn't go negative
    if (stockAfter < 0) {
      throw new BadRequestException(
        `Stock cannot be negative. Current stock: ${stockBefore}`,
      );
    }

    // Perform adjustment in a transaction
    await prisma.$transaction(async (tx) => {
      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: {
          branchId_productId: {
            branchId,
            productId,
          },
        },
        data: {
          stock: stockAfter,
        },
      });

      // Create adjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId,
          inventoryId: updatedInventory.id,
          branchId,
          productId,
          type,
          quantityChange,
          stockBefore,
          stockAfter,
          reason,
          adjustedBy: userId,
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
      });

      return adjustment;
    });
  }

  /**
   * Get adjustment history with filters
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
      type,
      startDate,
      endDate,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.StockAdjustmentWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(productId && { productId }),
      ...(type && { type }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const [totalCount, adjustments] = await Promise.all([
      prisma.stockAdjustment.count({ where }),
      prisma.stockAdjustment.findMany({
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
    ]);

    return {
      data: adjustments,
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
    const inventory = await prisma.inventory.findFirst({
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
      prisma.stockAdjustment.count({
        where: {
          inventoryId: inventory.id,
        },
      }),
      prisma.stockAdjustment.findMany({
        where: {
          inventoryId: inventory.id,
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
      data: adjustments,
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
    const where: Prisma.StockAdjustmentWhereInput = {
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
      prisma.stockAdjustment.count({ where }),
      prisma.stockAdjustment.groupBy({
        by: ['type'],
        where,
        _count: {
          type: true,
        },
      }),
    ]);

    const summary = {
      totalAdjustments,
      byType: adjustmentsByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    return summary;
  }
}
