import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';

@Injectable()
export class InventoryService {
  async getInventoryByBranch(
    branchId: string,
    params: { page?: number; limit?: number; search?: string },
  ) {
    const { page = 1, limit = 10, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {
      branchId,
      ...(search && {
        product: {
          name: { contains: search, mode: 'insensitive' },
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
}
