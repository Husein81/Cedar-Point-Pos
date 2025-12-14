import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@repo/db';
import { QueryParams } from '@repo/types';

// Type definitions for Prisma (will be available after prisma generate)
// These are temporary types until Prisma client is generated
type PrismaProductWhereInput = {
  tenantId?: string;
  OR?: Array<{
    name?: { contains: string; mode?: 'insensitive' };
    sku?: { contains: string; mode?: 'insensitive' };
  }>;
};

type PrismaProductOrderByWithRelationInput = {
  [key: string]: 'asc' | 'desc' | undefined;
  createdAt?: 'asc' | 'desc';
};

type PrismaProductCreateInput = Record<string, unknown>;
type PrismaProductUpdateInput = Record<string, unknown>;

// Type assertion for prisma client (types will be available after prisma generate)
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const typedPrisma = prisma as any;

@Injectable()
export class ProductsService {
  async getProductsByTenant(tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await typedPrisma.product.findMany({
      where: { tenantId },
    });
  }

  async getProductsPaginated(tenantId: string, params: QueryParams) {
    try {
      const { search, sort, order } = params;
      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 10;

      const skip = (page - 1) * limit;
      const where: PrismaProductWhereInput = { tenantId };
      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            sku: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ];
      }

      const orderBy: PrismaProductOrderByWithRelationInput = {};
      if (sort) {
        (orderBy as Record<string, any>)[sort] = order || 'asc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const [totalCount, data] = (await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        typedPrisma.product.count({ where }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        typedPrisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
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
    } catch (error) {
      console.error('Error fetching paginated products:', error);
      throw new InternalServerErrorException('Failed to fetch products');
    }
  }

  async getProductById(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await typedPrisma.product.findUnique({
      where: { id },
    });
  }

  async createProduct(data: PrismaProductCreateInput) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await typedPrisma.product.create({
        data,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async updateProduct(id: string, data: PrismaProductUpdateInput) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await typedPrisma.product.update({
        where: { id },
        data,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    } catch (error) {
      console.error('Error updating product:', error);
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  async deleteProduct(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await typedPrisma.product.delete({
        where: { id },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new InternalServerErrorException('Failed to delete product');
    }
  }

  async getModifiersByProduct(productId: string, tenantId: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const product = await typedPrisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
          isDeleted: false,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Fetch all modifiers for this product that are not deleted
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const modifiers = await typedPrisma.modifier.findMany({
        where: {
          productId,
          tenantId,
          isDeleted: false,
          group: {
            isDeleted: false,
          },
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
      type ModifierWithGroup = (typeof modifiers)[number];

      const modifierGroupsMap = new Map<
        string,
        {
          id: string;
          name: string;
          type: string;
          modifiers: Array<{
            id: string;
            name: string;
            price: number;
          }>;
        }
      >();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      modifiers.forEach((modifier: ModifierWithGroup) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const groupId = modifier.group.id as string;
        if (!modifierGroupsMap.has(groupId)) {
          modifierGroupsMap.set(groupId, {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            id: modifier.group.id as string,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            name: modifier.group.name as string,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            type: modifier.group.type as string,
            modifiers: [],
          });
        }

        const group = modifierGroupsMap.get(groupId)!;
        group.modifiers.push({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          id: modifier.id as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          name: modifier.name as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          price: Number(modifier.price as number | string),
        });
      });
      const modifierGroups = Array.from(modifierGroupsMap.values());

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        productId: product.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        productName: product.name,
        modifierGroups,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching modifiers by product:', error);
      throw new InternalServerErrorException(
        'Failed to fetch modifiers for product',
      );
    }
  }
}
