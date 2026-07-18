import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../media/storage/storage-provider.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /**
   * Derive the public `imageUrl` from the durable `imageKey` when present,
   * falling back to any legacy stored URL (pre-B2 Supabase rows). Keeping the
   * key as the source of truth means a CDN/bucket change is a one-line config
   * edit, not a data migration.
   */
  private withImageUrl<
    T extends { imageKey: string | null; imageUrl: string | null },
  >(product: T): T {
    return {
      ...product,
      imageUrl: product.imageKey
        ? this.storage.getPublicUrl(product.imageKey)
        : product.imageUrl,
    };
  }

  async getProductsByTenant(tenantId: string, branchId?: string) {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(branchId && {
        OR: [{ branchId }, { branchId: null }],
      }),
    };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        inventory: true,
        category: {
          include: {
            color: true,
          },
        },
        subcategory: true,
      },
    });

    return products.map((product) => this.withImageUrl(product));
  }

  async getProductsPaginated(
    tenantId: string,
    params: QueryParams & { branchId?: string },
  ) {
    try {
      const {
        branchId,
        search,
        sort,
        order,
        page: rawPage,
        limit: rawLimit,
      } = params;

      const page = Math.max(Number(rawPage) || 1, 1);
      const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      /**
       * 🔎 WHERE
       */
      const where: Prisma.ProductWhereInput = {
        tenantId,
        deletedAt: null,
        ...(branchId && {
          OR: [{ branchId }, { branchId: null }],
        }),
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
          include: {
            category: true,
            subcategory: true,
            inventory: true,
          },
        }),
      ]);

      return {
        data: data.map((product) => this.withImageUrl(product)),
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

  async getProductByBarcode(barcode: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        barcode,
        tenantId,
        deletedAt: null,
      },
      include: {
        category: true,
        subcategory: true,
        inventory: true,
      },
    });

    return product ? this.withImageUrl(product) : product;
  }

  async getProductById(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        subcategory: true,
        inventory: true,
      },
    });

    return product ? this.withImageUrl(product) : product;
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    try {
      const result = await this.prisma.product.create({
        data,
      });

      return this.withImageUrl(result);
    } catch (error) {
      console.error('Error creating product:', error);
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async updateProduct(
    params: { id?: string; tenantId?: string },
    data: Prisma.ProductUpdateInput,
  ) {
    try {
      const result = await this.prisma.product.update({
        where: { id: params.id, tenantId: params.tenantId },
        data,
      });
      return this.withImageUrl(result);
    } catch (error) {
      console.error('Error updating product:', error);
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  async deleteProduct(id: string, tenantId: string) {
    try {
      const result = await this.prisma.product.update({
        where: { id, tenantId, deletedAt: null },
        data: {
          deletedAt: new Date(),
        },
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
          tenantId,
          deletedAt: null,
          group: {
            deletedAt: null,
          },
          OR: [
            {
              productAssignments: {
                some: {
                  productId,
                },
              },
            },
            {
              AND: [
                { productAssignments: { none: {} } },
                { productId: productId },
              ],
            },
            {
              AND: [{ productAssignments: { none: {} } }, { productId: null }],
            },
          ],
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
          where: { id: productId, tenantId, deletedAt: null },
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
