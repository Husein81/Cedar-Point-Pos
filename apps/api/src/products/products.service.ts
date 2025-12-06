import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';
import { QueryParams } from '@repo/types';

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
      const where: Prisma.ProductWhereInput = { tenantId };
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

      const orderBy: Prisma.ProductOrderByWithRelationInput = {};
      if (sort) {
        (orderBy as Record<string, any>)[sort] = order || 'asc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const [totalCount, data] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
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
}
