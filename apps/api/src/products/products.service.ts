import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { PrismaService } from '../prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductsByTenant(tenantId: string) {
    return await this.prisma.product.findMany({
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

      const [totalCount, data] = (await Promise.all([
        this.prisma.product.count({ where }),

        this.prisma.product.findMany({
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
    return await this.prisma.product.findUnique({
      where: { id },
    });
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    try {
      const result = await this.prisma.product.create({
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
      const result = await this.prisma.product.update({
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
      const result = await this.prisma.product.delete({
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
      const modifiers = await this.prisma.modifier.findMany({
        where: {
          productId,
          tenantId,
          isDeleted: false,
          group: {
            isDeleted: false,
          },
          product: {
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

      if (modifiers.length === 0) {
        const productExists = await this.prisma.product.findFirst({
          where: { id: productId, tenantId, isDeleted: false },
          select: { id: true },
        });

        if (!productExists) {
          throw new NotFoundException('Product not found');
        }

        return {
          productId,
          modifierGroups: [],
        };
      }

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

      for (const modifier of modifiers) {
        const groupId = modifier.group.id;

        if (!modifierGroupsMap.has(groupId)) {
          modifierGroupsMap.set(groupId, {
            id: groupId,
            name: modifier.group.name,
            type: modifier.group.type,
            modifiers: [],
          });
        }

        const group = modifierGroupsMap.get(groupId);
        if (!group) {
          console.error(
            `Group ${groupId} not found in map for modifier ${modifier.id}`,
          );
          continue;
        }
        group.modifiers.push({
          id: modifier.id,
          name: modifier.name,
          price: Number(modifier.price),
        });
      }

      return {
        productId,
        modifierGroups: Array.from(modifierGroupsMap.values()),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      console.error('Error fetching modifiers by product:', error);
      throw new InternalServerErrorException(
        'Failed to fetch modifiers for product',
      );
    }
  }
}
