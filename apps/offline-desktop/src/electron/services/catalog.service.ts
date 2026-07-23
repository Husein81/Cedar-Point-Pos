// Categories + products: the catalog domain.

import type { Category, Paginated, Product } from "../../shared/models";
import type {
  CategoryInput,
  ListProductsInput,
  ProductInput,
} from "../../shared/schemas";
import type { CategoryRepository } from "../repositories/category.repository";
import type { ProductRepository } from "../repositories/product.repository";
import { ConflictError, NotFoundError } from "../core/errors";
import { newId, nowIso } from "../core/id";

export class CatalogService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
  ) {}

  // ── categories ──────────────────────────────────────────────────────

  listCategories(): Category[] {
    return this.categories.list();
  }

  createCategory(input: CategoryInput): Category {
    const id = newId();
    const now = nowIso();
    this.categories.insert({
      id,
      name: input.name,
      colorId: input.colorId,
      sortOrder: input.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
    // Non-null: the row was just inserted with this id, findById cannot miss.
    return this.categories.findById(id)!;
  }

  updateCategory(id: string, input: CategoryInput): Category {
    const existing = this.categories.findById(id);
    if (!existing) throw new NotFoundError("Category");

    this.categories.update({
      id,
      name: input.name,
      colorId: input.colorId,
      sortOrder: input.sortOrder,
      updatedAt: nowIso(),
    });
    // Non-null: existence was just confirmed above and update() can't delete.
    return this.categories.findById(id)!;
  }

  deleteCategory(id: string): void {
    const existing = this.categories.findById(id);
    if (!existing) throw new NotFoundError("Category");

    const productCount = this.categories.countProducts(id);
    if (productCount > 0) {
      throw new ConflictError(
        `Category has ${productCount} product(s). Move them first.`,
        "CATEGORY_IN_USE",
      );
    }

    this.categories.softDelete(id, nowIso());
  }

  // ── products ────────────────────────────────────────────────────────

  listProducts(params: ListProductsInput): Paginated<Product> {
    return this.products.list(params);
  }

  getProduct(id: string): Product {
    const product = this.products.findById(id);
    if (!product) throw new NotFoundError("Product");
    return product;
  }

  getProductByBarcode(barcode: string): Product | null {
    return this.products.findByBarcode(barcode);
  }

  listLowStock(): Product[] {
    return this.products.listLowStock();
  }

  createProduct(input: ProductInput): Product {
    if (input.categoryId && !this.categories.findById(input.categoryId)) {
      throw new NotFoundError("Category");
    }

    const now = nowIso();
    const product: Product = {
      id: newId(),
      name: input.name,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      price: input.price,
      cost: input.cost,
      stock: input.stock,
      trackInventory: input.trackInventory,
      lowStockThreshold: input.lowStockThreshold ?? null,
      categoryId: input.categoryId ?? null,
      category: null,
      imagePath: input.imagePath ?? null,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now,
    };
    this.products.insert(product);
    return this.getProduct(product.id);
  }

  updateProduct(id: string, input: ProductInput): Product {
    const existing = this.products.findById(id);
    if (!existing) throw new NotFoundError("Product");

    if (input.categoryId && !this.categories.findById(input.categoryId)) {
      throw new NotFoundError("Category");
    }

    const next: Product = {
      ...existing,
      name: input.name,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      price: input.price,
      cost: input.cost,
      stock: input.stock,
      trackInventory: input.trackInventory,
      lowStockThreshold: input.lowStockThreshold ?? null,
      categoryId: input.categoryId ?? null,
      imagePath: input.imagePath ?? null,
      isActive: input.isActive,
      updatedAt: nowIso(),
    };
    this.products.update(next);
    return this.getProduct(id);
  }

  deleteProduct(id: string): void {
    const existing = this.products.findById(id);
    if (!existing) throw new NotFoundError("Product");
    this.products.softDelete(id, nowIso());
  }
}
