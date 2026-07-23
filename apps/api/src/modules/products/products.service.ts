import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { InventoryTransactionService } from '../inventory/inventory-transaction.service.js';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../media/storage/storage-provider.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  BulkImportResult,
  BulkImportRowResult,
  BulkProductRowDto,
} from './dto/product.dto.js';

/**
 * How many per-row import transactions run in parallel. Kept low so the import
 * never exhausts the Prisma connection pool (default ≈ cpus*2+1) and starves
 * concurrent requests — a bulk admin op should not monopolise the DB.
 */
const BULK_IMPORT_CONCURRENCY = 5;

/**
 * A tenant-scoped, case-insensitive name→id index built once per import so row
 * resolution is an O(1) Map lookup instead of a per-row query. Names that
 * resolve to more than one id are tracked as ambiguous and rejected per row
 * rather than bound non-deterministically.
 */
interface NameIndex {
  byName: Map<string, string>;
  ambiguous: Set<string>;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryTransaction: InventoryTransactionService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

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

  /**
   * Bulk-create products from parsed CSV rows. Scaling-critical path:
   *
   * - Category/subcategory names are resolved from indexes built in TWO queries
   *   total (not per row) — no N+1 as the file grows.
   * - Rows are processed in bounded-concurrency batches, each in its own
   *   Serializable transaction, so one bad row never rolls back the others and
   *   the whole import isn't a single long lock.
   * - A duplicate sku/barcode (P2002) is reported as `skipped`, never
   *   overwriting an existing product. A systemic DB failure (pool exhaustion,
   *   lost connection) aborts the whole import instead of being reported as N
   *   row errors while it keeps hammering the database.
   */
  async bulkCreateProducts(input: {
    tenantId: string;
    userId: string;
    branchId?: string;
    rows: BulkProductRowDto[];
  }): Promise<BulkImportResult> {
    const { tenantId, userId, branchId, rows } = input;

    await this.assertBranchInTenant(tenantId, branchId);

    const [categoryIndex, subcategoryIndex] = await Promise.all([
      this.buildCategoryIndex(tenantId),
      this.buildSubcategoryIndex(tenantId),
    ]);

    const results = new Array<BulkImportRowResult>(rows.length);

    for (let start = 0; start < rows.length; start += BULK_IMPORT_CONCURRENCY) {
      const batch = rows.slice(start, start + BULK_IMPORT_CONCURRENCY);
      const settled = await Promise.all(
        batch.map((row, offset) =>
          this.importProductRow({
            row,
            rowNumber: start + offset + 1,
            tenantId,
            userId,
            branchId,
            categoryIndex,
            subcategoryIndex,
          }),
        ),
      );
      for (let i = 0; i < settled.length; i++) {
        results[start + i] = settled[i]!;
      }
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const result of results) {
      if (result.status === 'created') createdCount++;
      else if (result.status === 'skipped') skippedCount++;
      else errorCount++;
    }

    return { createdCount, skippedCount, errorCount, results };
  }

  /** Reject a client-supplied branchId that isn't in the caller's tenant. */
  private async assertBranchInTenant(
    tenantId: string,
    branchId?: string,
  ): Promise<void> {
    if (!branchId) return;
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, isDeleted: false },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException({
        message: 'Target branch not found',
        code: 'BRANCH_NOT_FOUND',
      });
    }
  }

  private async importProductRow(ctx: {
    row: BulkProductRowDto;
    rowNumber: number;
    tenantId: string;
    userId: string;
    branchId?: string;
    categoryIndex: NameIndex;
    subcategoryIndex: NameIndex;
  }): Promise<BulkImportRowResult> {
    const { row, rowNumber, tenantId, userId, branchId } = ctx;

    const categoryId = this.lookupName(ctx.categoryIndex, row.categoryName);
    if (categoryId.error) {
      return { row: rowNumber, status: 'error', message: categoryId.error };
    }

    // Subcategory requires a parent category to be scoped correctly
    if (row.subcategoryName && !categoryId.id) {
      return {
        row: rowNumber,
        status: 'error',
        message: 'Subcategory requires a category name',
      };
    }

    const subcategoryId = this.lookupName(
      ctx.subcategoryIndex,
      row.subcategoryName,
      categoryId.id,
    );
    if (subcategoryId.error) {
      return { row: rowNumber, status: 'error', message: subcategoryId.error };
    }

    const needsStock = typeof row.stock === 'number' && row.stock > 0;
    if (needsStock && !branchId) {
      return {
        row: rowNumber,
        status: 'error',
        message: 'A target branch is required to import initial stock',
      };
    }

    try {
      const productId = await this.prisma.$transaction(
        async (tx) => {
          const product = await tx.product.create({
            data: this.buildProductCreateData(
              row,
              tenantId,
              categoryId.id,
              subcategoryId.id,
            ),
            select: { id: true },
          });

          if (needsStock && branchId) {
            await this.inventoryTransaction.executeTransactionInTx(tx, {
              tenantId,
              branchId,
              productId: product.id,
              userId,
              changeType: 'ADJUST_STOCK',
              quantity: row.stock!,
              reason: 'Initial stock set during bulk import',
            });
          }

          return product.id;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 8000,
        },
      );

      return { row: rowNumber, status: 'created', productId };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = Array.isArray(error.meta?.target)
          ? (error.meta.target as string[]).join(', ')
          : String(error.meta?.target ?? 'unique field');
        return {
          row: rowNumber,
          status: 'skipped',
          message: `A product with this ${target} already exists`,
        };
      }

      // A systemic failure isn't this row's fault — abort the whole import
      // rather than emit N identical errors while hammering a failing DB.
      if (this.isSystemicDbError(error)) throw error;

      this.logger.error(`Bulk import row ${rowNumber} failed`, error as Error);
      return { row: rowNumber, status: 'error', message: 'Failed to import row' };
    }
  }

  private buildProductCreateData(
    row: BulkProductRowDto,
    tenantId: string,
    categoryId?: string,
    subcategoryId?: string,
  ): Prisma.ProductCreateInput {
    return {
      name: row.name,
      ...(row.description !== undefined && { description: row.description }),
      ...(row.sku !== undefined && { sku: row.sku }),
      ...(row.barcode !== undefined && { barcode: row.barcode }),
      ...(row.price !== undefined && { price: row.price }),
      ...(row.cost !== undefined && { cost: row.cost }),
      ...(row.isActive !== undefined && { isActive: row.isActive }),
      ...(row.isModifiable !== undefined && {
        isModifiable: row.isModifiable,
      }),
      tenant: { connect: { id: tenantId } },
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(subcategoryId && { subcategory: { connect: { id: subcategoryId } } }),
    };
  }

  /**
   * Resolve a CSV name against a prebuilt index. Returns `{ id }` (possibly
   * undefined when the name is blank), or `{ error }` when the name is unknown
   * or ambiguous. For subcategories, pass the resolved `categoryId` so the
   * lookup is scoped to the parent.
   */
  private lookupName(
    index: NameIndex,
    rawName: string | undefined,
    parentId?: string,
  ): { id?: string; error?: string } {
    const name = rawName?.trim();
    if (!name) return {};

    const key = this.indexKey(name, parentId);
    if (index.ambiguous.has(key)) {
      return { error: `Multiple entries named '${name}' — cannot resolve` };
    }
    const id = index.byName.get(key);
    if (!id) return { error: `'${name}' not found` };
    return { id };
  }

  private indexKey(name: string, parentId?: string): string {
    const normalized = name.trim().toLowerCase();
    return parentId ? `${parentId}::${normalized}` : normalized;
  }

  private async buildCategoryIndex(tenantId: string): Promise<NameIndex> {
    const categories = await this.prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    return this.toNameIndex(categories.map((c) => ({ key: this.indexKey(c.name), id: c.id })));
  }

  private async buildSubcategoryIndex(tenantId: string): Promise<NameIndex> {
    const subcategories = await this.prisma.subcategory.findMany({
      where: { deletedAt: null, category: { tenantId } },
      select: { id: true, name: true, categoryId: true },
    });
    return this.toNameIndex(
      subcategories.map((s) => ({
        key: this.indexKey(s.name, s.categoryId),
        id: s.id,
      })),
    );
  }

  private toNameIndex(entries: Array<{ key: string; id: string }>): NameIndex {
    const byName = new Map<string, string>();
    const ambiguous = new Set<string>();
    for (const { key, id } of entries) {
      if (ambiguous.has(key)) continue;
      if (byName.has(key)) {
        byName.delete(key);
        ambiguous.add(key);
      } else {
        byName.set(key, id);
      }
    }
    return { byName, ambiguous };
  }

  private isSystemicDbError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientInitializationError) return true;
    if (error instanceof Prisma.PrismaClientRustPanicError) return true;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P1xxx: connection/engine failures. P2024: connection-pool timeout.
      return error.code.startsWith('P1') || error.code === 'P2024';
    }
    return false;
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
