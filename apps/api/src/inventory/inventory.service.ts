/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';
import { InventoryChangeType, QueryParams } from '@repo/types';
import { CreateInventoryHistoryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  async getInventoryByBranch(branchId: string, params: QueryParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const search = params.search;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {
      branchId,
      ...(search && {
        product: {
          name: { contains: search, mode: Prisma.QueryMode.insensitive },
        },
      }),
    };

    const [totalCount, data] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        include: { product: true },
        skip,
        take: limit,
        orderBy: { product: { name: 'asc' } },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getInventoryItem(branchId: string, productId: string) {
    const item = await prisma.inventory.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  async setStock(
    tenantId: string,
    branchId: string,
    productId: string,
    stock: number,
    userId: string,
    reason?: string,
  ) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: {
          branchId_productId: {
            branchId,
            productId,
          },
        },
      });

      const beforeStock = existing ? Number(existing.stock) : 0;
      const afterStock = stock;

      const result = await tx.inventory.upsert({
        where: {
          branchId_productId: {
            branchId,
            productId,
          },
        },
        create: {
          tenantId,
          branchId,
          productId,
          stock: Number(stock),
        },
        update: {
          stock: Number(stock),
        },
        include: { product: true },
      });

      // Log history if stock actually changed
      if (beforeStock !== afterStock) {
        await this.createHistoryLog(tx, {
          tenantId,
          branchId,
          productId,
          userId,
          changeType: InventoryChangeType.SET_STOCK,
          beforeStock,
          afterStock,
          reason,
        });
      }

      return result;
    });
  }

  async adjustStock(
    tenantId: string,
    branchId: string,
    productId: string,
    adjustment: number,
    userId: string,
    reason?: string,
  ) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: { branchId_productId: { branchId, productId } },
      });

      const beforeStock = existing ? Number(existing.stock) : 0;
      const afterStock = beforeStock + adjustment;

      let result;
      if (existing) {
        result = await tx.inventory.update({
          where: { branchId_productId: { branchId, productId } },
          data: { stock: { increment: adjustment } },
          include: { product: true },
        });
      } else {
        result = await tx.inventory.create({
          data: {
            tenantId,
            branchId,
            productId,
            stock: Number(adjustment),
          },
          include: { product: true },
        });
      }

      // Log history
      await this.createHistoryLog(tx, {
        tenantId,
        branchId,
        productId,
        userId,
        changeType: InventoryChangeType.ADJUST_STOCK,
        beforeStock,
        afterStock,
        reason,
      });

      return result;
    });
  }

  /**
   * Get products below minimum stock threshold for a specific branch
   */
  async getLowStockByBranch(
    branchId: string,
    params: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    // Get all inventory items with minStock > 0
    const allItems = await prisma.inventory.findMany({
      where: {
        branchId,
        minStock: { gt: 0 },
      },
      include: {
        product: true,
      },
    });

    // Filter where stock < minStock and calculate deficit
    const lowStockItems = allItems
      .filter((item) => Number(item.stock) < Number(item.minStock))
      .map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        branchId: item.branchId,
        productId: item.productId,
        stock: Number(item.stock),
        minStock: Number(item.minStock),
        productName: String(item.product.name),
        productSku: String(item.product.sku),
        deficit: Number(item.minStock) - Number(item.stock),
      }))
      .sort((a, b) => b.deficit - a.deficit);

    const totalCount = lowStockItems.length;
    const data = lowStockItems.slice(skip, skip + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get all low stock products across all branches for a tenant
   */
  async getLowStockByTenant(
    tenantId: string,
    params: { page?: number; limit?: number; branchId?: string },
  ) {
    const { page = 1, limit = 10, branchId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {
      tenantId,
      minStock: { gt: 0 },
      ...(branchId && { branchId }),
    };

    // Get all inventory items with minStock > 0
    const allItems = await prisma.inventory.findMany({
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
      },
    });

    // Filter where stock < minStock and calculate deficit
    const lowStockItems = allItems
      .filter((item) => Number(item.stock) < Number(item.minStock))
      .map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        branchId: item.branchId,
        branchName: item.branch.name,
        productId: item.productId,
        stock: Number(item.stock),
        minStock: Number(item.minStock),
        productName: item.product.name,
        productSku: item.product.sku,
        deficit: Number(item.minStock) - Number(item.stock),
      }))
      .sort((a, b) => b.deficit - a.deficit);

    const totalCount = lowStockItems.length;
    const data = lowStockItems.slice(skip, skip + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Set minimum stock threshold for a product at a branch
   */
  async setMinStock(
    tenantId: string,
    branchId: string,
    productId: string,
    minStock: number,
    userId: string,
    reason?: string,
  ) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: {
          branchId_productId: {
            branchId,
            productId,
          },
        },
      });

      const beforeMinStock = existing ? Number(existing.minStock) : 0;
      const afterMinStock = minStock;
      const beforeStock = existing ? Number(existing.stock) : 0;
      const afterStock = beforeStock; // Stock doesn't change, only minStock

      const result = await tx.inventory.upsert({
        where: {
          branchId_productId: {
            branchId,
            productId,
          },
        },
        create: {
          tenantId,
          branchId,
          productId,
          stock: Number(0),
          minStock: Number(minStock),
        },
        update: {
          minStock: Number(minStock),
        },
        include: { product: true, branch: true },
      });

      // Log history if minStock actually changed
      if (beforeMinStock !== afterMinStock) {
        await this.createHistoryLog(tx, {
          tenantId,
          branchId,
          productId,
          userId,
          changeType: InventoryChangeType.SET_MIN_STOCK,
          beforeStock,
          afterStock,
          beforeMinStock,
          afterMinStock,
          reason,
        });
      }

      return result;
    });
  }

  /**
   * Bulk set minimum stock thresholds for multiple products
   */
  async bulkSetMinStock(
    tenantId: string,
    branchId: string,
    items: Array<{ productId: string; minStock: number }>,
    userId: string,
    reason?: string,
  ) {
    return await prisma.$transaction(async (tx) => {
      // First, get existing inventory items
      const existingItems = await tx.inventory.findMany({
        where: {
          branchId,
          productId: { in: items.map((item) => item.productId) },
        },
      });

      const existingMap = new Map(
        existingItems.map((item) => [item.productId, item]),
      );

      // Update inventory and create history logs
      const results = await Promise.all(
        items.map(async (item) => {
          const existing = existingMap.get(item.productId);
          const beforeMinStock = existing ? Number(existing.minStock) : 0;
          const afterMinStock = item.minStock;
          const beforeStock = existing ? Number(existing.stock) : 0;
          const afterStock = beforeStock; // Stock doesn't change

          const result = await tx.inventory.upsert({
            where: {
              branchId_productId: {
                branchId,
                productId: item.productId,
              },
            },
            create: {
              tenantId,
              branchId,
              productId: item.productId,
              stock: Number(0),
              minStock: Number(item.minStock),
            },
            update: {
              minStock: Number(item.minStock),
            },
            include: { product: true },
          });

          // Log history if minStock actually changed
          if (beforeMinStock !== afterMinStock) {
            await this.createHistoryLog(tx, {
              tenantId,
              branchId,
              productId: item.productId,
              userId,
              changeType: InventoryChangeType.SET_MIN_STOCK,
              beforeStock,
              afterStock,
              beforeMinStock,
              afterMinStock,
              reason,
            });
          }

          return result;
        }),
      );

      return results;
    });
  }

  /**
   * Get inventory history log with filtering and pagination
   */
  async getInventoryHistory(
    tenantId: string,
    params: QueryParams & {
      startDate?: string;
      endDate?: string;
      productId: string;
      branchId: string;
      userId: string;
    },
  ) {
    const { branchId, productId, userId, startDate, endDate } = params;
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(branchId && { branchId }),
      ...(productId && { productId }),
      ...(userId && { userId }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      }),
    };

    const [totalCount, data] = (await Promise.all([
      prisma.inventoryHistory.count({ where }),
      prisma.inventoryHistory.findMany({
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
        orderBy: { createdAt: 'desc' },
      }),
    ])) as [number, unknown[]];

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  private async createHistoryLog(
    tx: Prisma.TransactionClient,
    data: CreateInventoryHistoryDto,
  ) {
    const {
      afterStock,
      beforeStock,
      changeType,
      tenantId,
      branchId,
      productId,
      userId,
      reason,
      beforeMinStock,
      afterMinStock,
    } = data;
    const adjustment = Number(afterStock) - Number(beforeStock);
    await tx.inventoryHistory.create({
      data: {
        tenantId: tenantId!,
        branchId: branchId!,
        productId: productId!,
        userId: userId!,
        changeType: changeType!,
        beforeStock: Number(beforeStock),
        afterStock: Number(afterStock),
        adjustment,
        ...(beforeMinStock !== undefined && {
          beforeMinStock: Number(beforeMinStock),
        }),
        ...(afterMinStock !== undefined && {
          afterMinStock: Number(afterMinStock),
        }),
        ...(reason && { reason }),
      },
    });
  }
}
