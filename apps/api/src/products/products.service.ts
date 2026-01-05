import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
      const { search, sort, order, page: rawPage, limit: rawLimit } = params;

      const page = Math.max(Number(rawPage) || 1, 1);
      const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      /**
       * 🔎 WHERE
       */
      const where: Prisma.ProductWhereInput = {
        tenantId,
      };

      const searchTerm = search?.trim();
      if (searchTerm) {
        where.OR = [
          {
            name: {
              contains: searchTerm,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            sku: {
              contains: searchTerm,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            barcode: {
              contains: searchTerm,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ];
      }

      /**
       * 🔃 ORDER BY (SAFE)
       */
      const sortableFields: Record<string, true> = {
        name: true,
        price: true,
        cost: true,
        createdAt: true,
        updatedAt: true,
      };

      const sortField = sort && sortableFields[sort] ? sort : 'createdAt';
      const sortOrder: Prisma.SortOrder =
        order === 'asc' || order === 'desc' ? order : 'desc';

      const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
        { [sortField]: sortOrder },
        { id: 'desc' }, // ✅ stable pagination
      ];

      /**
       * 📦 QUERY
       */
      const [totalCount, data] = await this.prisma.$transaction([
        this.prisma.product.count({ where }),
        this.prisma.product.findMany({
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
    return await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
      },
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
