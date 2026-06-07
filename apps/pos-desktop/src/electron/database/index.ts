import Database from "better-sqlite3";
import path from "node:path";
import { app } from "electron";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "pos.db");

  db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");

  db.pragma("user_version = 1");

  initSchema(db);

  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_operations (
      id TEXT PRIMARY KEY,

      entityType TEXT NOT NULL,
      operationType TEXT NOT NULL,
      entityId TEXT NOT NULL,

      payload TEXT NOT NULL,

      status TEXT NOT NULL DEFAULT 'PENDING',

      retries INTEGER NOT NULL DEFAULT 0,
      maxRetries INTEGER NOT NULL DEFAULT 10,

      lastError TEXT,

      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      syncedAt INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sync_status
    ON sync_operations(status);

    CREATE INDEX IF NOT EXISTS idx_sync_created
    ON sync_operations(createdAt);
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
