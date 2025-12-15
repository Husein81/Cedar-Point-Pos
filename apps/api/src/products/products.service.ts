import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';
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

@Injectable()
export class ProductsService {
  async getProductsByTenant(tenantId: string) {
    return await prisma.product.findMany({
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
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            sku: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
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
        prisma.product.count({ where }),

        prisma.product.findMany({
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
    return await prisma.product.findUnique({
      where: { id },
    });
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    try {
      const result = await prisma.product.create({
        data,
      });

      return result;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    try {
      const result = await prisma.product.update({
        where: { id },
        data,
      });
      return result;
    } catch (error) {
      console.error('Error updating product:', error);
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  async deleteProduct(id: string) {
    try {
      const result = await prisma.product.delete({
        where: { id },
      });
      return result;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new InternalServerErrorException('Failed to delete product');
    }
  }

  async getModifiersByProduct(productId: string, tenantId: string) {
    try {
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

      // Fetch all modifiers for this product that are not deleted
      const modifiers = await prisma.modifier.findMany({
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

      return {
        productId: product.id,
        productName: product.name,
        modifiers,
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
