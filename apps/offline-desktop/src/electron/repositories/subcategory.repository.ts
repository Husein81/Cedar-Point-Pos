import type Database from "better-sqlite3";
import type { Subcategory } from "../../shared/models";

const SELECT_SUBCATEGORY = `
  SELECT id, categoryId, name, createdAt, updatedAt
  FROM subcategories
`;

export class SubcategoryRepository {
  constructor(private readonly db: Database.Database) {}

  listByCategory(categoryId: string): Subcategory[] {
    return this.db
      .prepare<[string], Subcategory>(
        `${SELECT_SUBCATEGORY} WHERE categoryId = ? AND deletedAt IS NULL ORDER BY name`,
      )
      .all(categoryId);
  }

  // Used to build the nested subcategories[] on every Category read.
  listByCategoryIds(categoryIds: string[]): Map<string, Subcategory[]> {
    const byCategory = new Map<string, Subcategory[]>();
    if (categoryIds.length === 0) return byCategory;

    const placeholders = categoryIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare<string[], Subcategory>(
        `${SELECT_SUBCATEGORY} WHERE categoryId IN (${placeholders}) AND deletedAt IS NULL ORDER BY name`,
      )
      .all(...categoryIds);

    for (const row of rows) {
      const list = byCategory.get(row.categoryId) ?? [];
      list.push(row);
      byCategory.set(row.categoryId, list);
    }
    return byCategory;
  }

  findById(id: string): Subcategory | null {
    return (
      this.db
        .prepare<[string], Subcategory>(
          `${SELECT_SUBCATEGORY} WHERE id = ? AND deletedAt IS NULL`,
        )
        .get(id) ?? null
    );
  }

  insert(subcategory: Subcategory): void {
    this.db
      .prepare(
        `INSERT INTO subcategories (id, categoryId, name, createdAt, updatedAt)
         VALUES (@id, @categoryId, @name, @createdAt, @updatedAt)`,
      )
      .run(subcategory);
  }

  update(subcategory: { id: string; name: string; updatedAt: string }): void {
    this.db
      .prepare(
        `UPDATE subcategories SET name = @name, updatedAt = @updatedAt
         WHERE id = @id AND deletedAt IS NULL`,
      )
      .run(subcategory);
  }

  softDelete(id: string, at: string): void {
    this.db
      .prepare(
        "UPDATE subcategories SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL",
      )
      .run(at, at, id);
  }

  countProducts(subcategoryId: string): number {
    const row = this.db
      .prepare<[string], { count: number }>(
        "SELECT COUNT(*) as count FROM products WHERE subcategoryId = ? AND deletedAt IS NULL",
      )
      .get(subcategoryId);
    return row?.count ?? 0;
  }
}
