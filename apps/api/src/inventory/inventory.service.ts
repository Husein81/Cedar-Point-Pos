import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';
import { QueryParams } from '@repo/types';

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
  ) {
    return prisma.inventory.upsert({
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
        stock: new Prisma.Decimal(stock),
      },
      update: {
        stock: new Prisma.Decimal(stock),
      },
      include: { product: true },
    });
  }

  async adjustStock(
    tenantId: string,
    branchId: string,
    productId: string,
    adjustment: number,
  ) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: { branchId_productId: { branchId, productId } },
      });

      if (existing) {
        return tx.inventory.update({
          where: { branchId_productId: { branchId, productId } },
          data: { stock: { increment: adjustment } },
          include: { product: true },
        });
      } else {
        return tx.inventory.create({
          data: {
            tenantId,
            branchId,
            productId,
            stock: new Prisma.Decimal(adjustment),
          },
          include: { product: true },
        });
      }
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
  ) {
    return prisma.inventory.upsert({
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
        stock: new Prisma.Decimal(0),
        minStock: new Prisma.Decimal(minStock),
      },
      update: {
        minStock: new Prisma.Decimal(minStock),
      },
      include: { product: true, branch: true },
    });
  }

  /**
   * Bulk set minimum stock thresholds for multiple products
   */
  async bulkSetMinStock(
    tenantId: string,
    branchId: string,
    items: Array<{ productId: string; minStock: number }>,
  ) {
    const results = await prisma.$transaction(
      items.map((item) =>
        prisma.inventory.upsert({
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
            stock: new Prisma.Decimal(0),
            minStock: new Prisma.Decimal(item.minStock),
          },
          update: {
            minStock: new Prisma.Decimal(item.minStock),
          },
          include: { product: true },
        }),
      ),
    );

    return results;
  }
}
