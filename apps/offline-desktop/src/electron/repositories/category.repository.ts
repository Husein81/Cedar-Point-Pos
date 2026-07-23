import type Database from "better-sqlite3";
import type { Category } from "../../shared/models";

type CategoryRow = {
  id: string;
  name: string;
  colorId: string | null;
  colorName: string | null;
  colorHex: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const SELECT_CATEGORY = `
  SELECT c.id, c.name, c.colorId, co.name AS colorName, co.hex AS colorHex,
         c.sortOrder, c.createdAt, c.updatedAt
  FROM categories c
  LEFT JOIN colors co ON co.id = c.colorId
`;

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  color: row.colorId
    ? { id: row.colorId, name: row.colorName ?? "", hex: row.colorHex ?? "" }
    : null,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class CategoryRepository {
  constructor(private readonly db: Database.Database) {}

  list(): Category[] {
    return this.db
      .prepare<[], CategoryRow>(
        `${SELECT_CATEGORY} WHERE c.deletedAt IS NULL ORDER BY c.sortOrder, c.name`,
      )
      .all()
      .map(toCategory);
  }

  findById(id: string): Category | null {
    const row = this.db
      .prepare<[string], CategoryRow>(
        `${SELECT_CATEGORY} WHERE c.id = ? AND c.deletedAt IS NULL`,
      )
      .get(id);
    return row ? toCategory(row) : null;
  }

  insert(category: { id: string; name: string; colorId: string | null; sortOrder: number; createdAt: string; updatedAt: string }): void {
    this.db
      .prepare(
        `INSERT INTO categories (id, name, colorId, sortOrder, createdAt, updatedAt)
         VALUES (@id, @name, @colorId, @sortOrder, @createdAt, @updatedAt)`,
      )
      .run(category);
  }

  update(category: { id: string; name: string; colorId: string | null; sortOrder: number; updatedAt: string }): void {
    this.db
      .prepare(
        `UPDATE categories
         SET name = @name, colorId = @colorId, sortOrder = @sortOrder, updatedAt = @updatedAt
         WHERE id = @id AND deletedAt IS NULL`,
      )
      .run(category);
  }

  softDelete(id: string, at: string): void {
    this.db
      .prepare(
        "UPDATE categories SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL",
      )
      .run(at, at, id);
  }

  countProducts(categoryId: string): number {
    const row = this.db
      .prepare<[string], { count: number }>(
        "SELECT COUNT(*) as count FROM products WHERE categoryId = ? AND deletedAt IS NULL",
      )
      .get(categoryId);
    return row?.count ?? 0;
  }
}
