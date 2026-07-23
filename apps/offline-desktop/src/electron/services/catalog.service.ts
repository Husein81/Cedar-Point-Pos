// Categories + products: the catalog domain.

import type { Category, Paginated, Product, Subcategory } from "../../shared/models";
import type {
  CategoryInput,
  ListProductsInput,
  ProductInput,
  SubcategoryInput,
} from "../../shared/schemas";
import type { CategoryRepository } from "../repositories/category.repository";
import type { ProductRepository } from "../repositories/product.repository";
import type { SubcategoryRepository } from "../repositories/subcategory.repository";
import { ConflictError, NotFoundError, ValidationError } from "../core/errors";
import { newId, nowIso } from "../core/id";

export class CatalogService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
    private readonly subcategories: SubcategoryRepository,
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

  // ── subcategories ───────────────────────────────────────────────────

  createSubcategory(categoryId: string, input: SubcategoryInput): Subcategory {
    if (!this.categories.findById(categoryId)) {
      throw new NotFoundError("Category");
    }

    const now = nowIso();
    const subcategory: Subcategory = {
      id: newId(),
      categoryId,
      name: input.name,
      createdAt: now,
      updatedAt: now,
    };
    this.subcategories.insert(subcategory);
    return subcategory;
  }

  updateSubcategory(id: string, input: SubcategoryInput): Subcategory {
    const existing = this.subcategories.findById(id);
    if (!existing) throw new NotFoundError("Subcategory");

    const updatedAt = nowIso();
    this.subcategories.update({ id, name: input.name, updatedAt });
    return { ...existing, name: input.name, updatedAt };
  }

  deleteSubcategory(id: string): void {
    const existing = this.subcategories.findById(id);
    if (!existing) throw new NotFoundError("Subcategory");

    const productCount = this.subcategories.countProducts(id);
    if (productCount > 0) {
      throw new ConflictError(
        `Subcategory has ${productCount} product(s). Move them first.`,
        "SUBCATEGORY_IN_USE",
      );
    }

    this.subcategories.softDelete(id, nowIso());
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

  // A subcategory must belong to the product's chosen category — prevents a
  // product ending up tagged with a subcategory from an unrelated category.
  private assertSubcategoryBelongsToCategory(
    subcategoryId: string | null | undefined,
    categoryId: string | null | undefined,
  ): void {
    if (!subcategoryId) return;

    const subcategory = this.subcategories.findById(subcategoryId);
    if (!subcategory) throw new NotFoundError("Subcategory");
    if (subcategory.categoryId !== categoryId) {
      throw new ValidationError(
        "Subcategory does not belong to the selected category",
      );
    }
  }

  createProduct(input: ProductInput): Product {
    if (input.categoryId && !this.categories.findById(input.categoryId)) {
      throw new NotFoundError("Category");
    }
    this.assertSubcategoryBelongsToCategory(
      input.subcategoryId,
      input.categoryId,
    );

    const now = nowIso();
    const product = {
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
      subcategoryId: input.subcategoryId ?? null,
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
    this.assertSubcategoryBelongsToCategory(
      input.subcategoryId,
      input.categoryId,
    );

    const next = {
      id: existing.id,
      name: input.name,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      price: input.price,
      cost: input.cost,
      stock: input.stock,
      trackInventory: input.trackInventory,
      lowStockThreshold: input.lowStockThreshold ?? null,
      categoryId: input.categoryId ?? null,
      subcategoryId: input.subcategoryId ?? null,
      imagePath: input.imagePath ?? null,
      isActive: input.isActive,
      createdAt: existing.createdAt,
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
