import type Database from "better-sqlite3";
import type { Paginated, Product } from "../../shared/models";
import type { ListProductsInput } from "../../shared/schemas";
import { toBool, fromBool } from "./rows";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  trackInventory: number;
  lowStockThreshold: number | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySortOrder: number | null;
  categoryCreatedAt: string | null;
  categoryUpdatedAt: string | null;
  colorId: string | null;
  colorName: string | null;
  colorHex: string | null;
  imagePath: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

const SELECT_PRODUCT = `
  SELECT p.id, p.name, p.sku, p.barcode, p.price, p.cost, p.stock,
         p.trackInventory, p.lowStockThreshold, p.categoryId,
         c.name AS categoryName, c.sortOrder AS categorySortOrder,
         c.createdAt AS categoryCreatedAt, c.updatedAt AS categoryUpdatedAt,
         c.colorId, co.name AS colorName, co.hex AS colorHex,
         p.imagePath, p.isActive, p.createdAt, p.updatedAt
  FROM products p
  LEFT JOIN categories c ON c.id = p.categoryId
  LEFT JOIN colors co ON co.id = c.colorId
`;

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  barcode: row.barcode,
  price: row.price,
  cost: row.cost,
  stock: row.stock,
  trackInventory: toBool(row.trackInventory),
  lowStockThreshold: row.lowStockThreshold,
  categoryId: row.categoryId,
  category: row.categoryId
    ? {
        id: row.categoryId,
        name: row.categoryName ?? "",
        color: row.colorId
          ? { id: row.colorId, name: row.colorName ?? "", hex: row.colorHex ?? "" }
          : null,
        sortOrder: row.categorySortOrder ?? 0,
        createdAt: row.categoryCreatedAt ?? row.createdAt,
        updatedAt: row.categoryUpdatedAt ?? row.updatedAt,
      }
    : null,
  imagePath: row.imagePath,
  isActive: toBool(row.isActive),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// Only these columns are persisted for a product — category is joined in on
// read, never stored inline (categoryId is the sole FK column).
type ProductRecord = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number | null;
  categoryId: string | null;
  imagePath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export class ProductRepository {
  constructor(private readonly db: Database.Database) {}

  list(params: ListProductsInput): Paginated<Product> {
    const where: string[] = ["p.deletedAt IS NULL"];
    const args: Record<string, unknown> = {};

    if (params.search) {
      // Matches name, SKU, or barcode. LIKE with a leading pattern uses the
      // name index for prefix searches; barcode lookups go through the exact
      // getByBarcode path instead.
      where.push("(p.name LIKE @search OR p.sku LIKE @search OR p.barcode LIKE @search)");
      args.search = `%${params.search}%`;
    }
    if (params.categoryId) {
      where.push("p.categoryId = @categoryId");
      args.categoryId = params.categoryId;
    }
    if (params.activeOnly) {
      where.push("p.isActive = 1");
    }
    if (params.lowStockOnly) {
      where.push(
        "p.trackInventory = 1 AND p.lowStockThreshold IS NOT NULL AND p.stock <= p.lowStockThreshold",
      );
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const totalRow = this.db
      .prepare<Record<string, unknown>, { count: number }>(
        `SELECT COUNT(*) as count FROM products p ${whereSql}`,
      )
      .get(args);

    const items = this.db
      .prepare<Record<string, unknown>, ProductRow>(
        `${SELECT_PRODUCT} ${whereSql} ORDER BY p.name LIMIT @limit OFFSET @offset`,
      )
      .all({
        ...args,
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
      })
      .map(toProduct);

    return {
      items,
      total: totalRow?.count ?? 0,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  findById(id: string): Product | null {
    const row = this.db
      .prepare<[string], ProductRow>(
        `${SELECT_PRODUCT} WHERE p.id = ? AND p.deletedAt IS NULL`,
      )
      .get(id);
    return row ? toProduct(row) : null;
  }

  findByBarcode(barcode: string): Product | null {
    const row = this.db
      .prepare<[string], ProductRow>(
        `${SELECT_PRODUCT} WHERE p.barcode = ? AND p.deletedAt IS NULL AND p.isActive = 1`,
      )
      .get(barcode);
    return row ? toProduct(row) : null;
  }

  listLowStock(): Product[] {
    return this.db
      .prepare<[], ProductRow>(
        `${SELECT_PRODUCT}
         WHERE p.deletedAt IS NULL AND p.trackInventory = 1
           AND p.lowStockThreshold IS NOT NULL AND p.stock <= p.lowStockThreshold
         ORDER BY p.stock ASC`,
      )
      .all()
      .map(toProduct);
  }

  insert(product: ProductRecord): void {
    this.db
      .prepare(
        `INSERT INTO products (id, name, sku, barcode, price, cost, stock, trackInventory,
                               lowStockThreshold, categoryId, imagePath, isActive, createdAt, updatedAt)
         VALUES (@id, @name, @sku, @barcode, @price, @cost, @stock, @trackInventory,
                 @lowStockThreshold, @categoryId, @imagePath, @isActive, @createdAt, @updatedAt)`,
      )
      .run({
        ...product,
        trackInventory: fromBool(product.trackInventory),
        isActive: fromBool(product.isActive),
      });
  }

  update(product: ProductRecord): void {
    this.db
      .prepare(
        `UPDATE products
         SET name = @name, sku = @sku, barcode = @barcode, price = @price, cost = @cost,
             stock = @stock, trackInventory = @trackInventory, lowStockThreshold = @lowStockThreshold,
             categoryId = @categoryId, imagePath = @imagePath, isActive = @isActive, updatedAt = @updatedAt
         WHERE id = @id AND deletedAt IS NULL`,
      )
      .run({
        ...product,
        trackInventory: fromBool(product.trackInventory),
        isActive: fromBool(product.isActive),
      });
  }

  softDelete(id: string, at: string): void {
    this.db
      .prepare(
        "UPDATE products SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL",
      )
      .run(at, at, id);
  }

  // Atomic stock delta — the only way stock changes outside product edits.
  adjustStock(productId: string, delta: number, at: string): void {
    this.db
      .prepare(
        "UPDATE products SET stock = stock + ?, updatedAt = ? WHERE id = ? AND trackInventory = 1",
      )
      .run(delta, at, productId);
  }
}

export type { ProductRecord };
