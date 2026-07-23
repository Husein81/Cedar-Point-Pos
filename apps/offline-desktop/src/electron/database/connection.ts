import Database from "better-sqlite3";
import path from "node:path";
import { app } from "electron";
import { runMigrations } from "./migrations";

let db: Database.Database | null = null;

export function getDbPath() {
  return path.join(app.getPath("userData"), "offline-pos.db");
}

export function getDatabase(): Database.Database {
  if (db) return db;

  db = new Database(getDbPath());

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");

  runMigrations(db);

  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// Used by backup/restore: close, swap the file, then reopen lazily.
export function reopenDatabase(): Database.Database {
  closeDatabase();
  return getDatabase();
}
