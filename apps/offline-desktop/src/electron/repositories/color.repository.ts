import type Database from "better-sqlite3";
import type { Color } from "../../shared/models";

export class ColorRepository {
  constructor(private readonly db: Database.Database) {}

  list(): Color[] {
    return this.db
      .prepare<[], Color>(
        `SELECT id, name, hex, createdAt, updatedAt
         FROM colors ORDER BY name`,
      )
      .all();
  }

  findById(id: string): Color | null {
    return (
      this.db
        .prepare<[string], Color>(
          `SELECT id, name, hex, createdAt, updatedAt FROM colors WHERE id = ?`,
        )
        .get(id) ?? null
    );
  }

  findByName(name: string): Color | null {
    return (
      this.db
        .prepare<[string], Color>(
          `SELECT id, name, hex, createdAt, updatedAt FROM colors WHERE name = ? COLLATE NOCASE`,
        )
        .get(name) ?? null
    );
  }

  insert(color: Color): void {
    this.db
      .prepare(
        `INSERT INTO colors (id, name, hex, createdAt, updatedAt)
         VALUES (@id, @name, @hex, @createdAt, @updatedAt)`,
      )
      .run(color);
  }

  update(color: Color): void {
    this.db
      .prepare(
        `UPDATE colors SET name = @name, hex = @hex, updatedAt = @updatedAt
         WHERE id = @id`,
      )
      .run(color);
  }

  delete(id: string): void {
    this.db.prepare(`DELETE FROM colors WHERE id = ?`).run(id);
  }

  insertMany(colors: Color[]): number {
    const insert = this.db.prepare(
      `INSERT OR IGNORE INTO colors (id, name, hex, createdAt, updatedAt)
       VALUES (@id, @name, @hex, @createdAt, @updatedAt)`,
    );
    const insertAll = this.db.transaction((rows: Color[]) => {
      let inserted = 0;
      for (const row of rows) {
        const result = insert.run(row);
        inserted += result.changes;
      }
      return inserted;
    });
    return insertAll(colors);
  }
}
