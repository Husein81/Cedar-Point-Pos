import type Database from "better-sqlite3";
import type { User } from "../../shared/models";
import type { UserRole } from "../../shared/enums";
import { toBool, fromBool } from "./rows";

type UserRow = {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

// Internal shape including the hash — never crosses IPC.
export type UserRecord = User & { passwordHash: string };

const toRecord = (row: UserRow): UserRecord => ({
  id: row.id,
  name: row.name,
  username: row.username,
  passwordHash: row.passwordHash,
  role: row.role,
  isActive: toBool(row.isActive),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class UserRepository {
  constructor(private readonly db: Database.Database) {}

  findByUsername(username: string): UserRecord | null {
    const row = this.db
      .prepare<[string], UserRow>(
        "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
      )
      .get(username);
    return row ? toRecord(row) : null;
  }

  findById(id: string): UserRecord | null {
    const row = this.db
      .prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?")
      .get(id);
    return row ? toRecord(row) : null;
  }

  list(): UserRecord[] {
    return this.db
      .prepare<[], UserRow>("SELECT * FROM users ORDER BY name")
      .all()
      .map(toRecord);
  }

  count(): number {
    const row = this.db
      .prepare<[], { count: number }>("SELECT COUNT(*) as count FROM users")
      .get();
    return row?.count ?? 0;
  }

  insert(record: UserRecord): void {
    this.db
      .prepare(
        `INSERT INTO users (id, name, username, passwordHash, role, isActive, createdAt, updatedAt)
         VALUES (@id, @name, @username, @passwordHash, @role, @isActive, @createdAt, @updatedAt)`,
      )
      .run({ ...record, isActive: fromBool(record.isActive) });
  }

  update(record: UserRecord): void {
    this.db
      .prepare(
        `UPDATE users
         SET name = @name, username = @username, passwordHash = @passwordHash,
             role = @role, isActive = @isActive, updatedAt = @updatedAt
         WHERE id = @id`,
      )
      .run({ ...record, isActive: fromBool(record.isActive) });
  }
}
