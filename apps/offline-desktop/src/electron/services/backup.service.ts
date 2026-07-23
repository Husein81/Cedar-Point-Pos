import { dialog } from "electron";
import fs from "node:fs";
import Database from "better-sqlite3";
import { closeDatabase, getDatabase, getDbPath } from "../database/connection";
import { AppError } from "../core/errors";

export class BackupService {
  // Export a consistent snapshot via SQLite's online backup API.
  async exportBackup(): Promise<{ path: string } | null> {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const result = await dialog.showSaveDialog({
      title: "Export Backup",
      defaultPath: `pos-backup-${stamp}.db`,
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });
    if (result.canceled || !result.filePath) return null;

    await getDatabase().backup(result.filePath);
    return { path: result.filePath };
  }

  async restoreBackup(): Promise<{ restored: boolean }> {
    const result = await dialog.showOpenDialog({
      title: "Restore Backup",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"],
    });
    const backupPath = result.filePaths[0];
    if (result.canceled || !backupPath) return { restored: false };

    this.validateBackup(backupPath);

    const dbPath = getDbPath();
    closeDatabase();

    // Keep a safety copy of the current DB before overwriting.
    const safetyPath = `${dbPath}.pre-restore`;
    fs.copyFileSync(dbPath, safetyPath);

    try {
      fs.copyFileSync(backupPath, dbPath);
      // Stale WAL/SHM files from the old database corrupt the restored one.
      for (const suffix of ["-wal", "-shm"]) {
        const sidecar = `${dbPath}${suffix}`;
        if (fs.existsSync(sidecar)) fs.rmSync(sidecar);
      }
      getDatabase(); // reopen + run migrations against the restored file
      return { restored: true };
    } catch (error) {
      // Roll back to the safety copy.
      fs.copyFileSync(safetyPath, dbPath);
      getDatabase();
      throw error;
    }
  }

  // A valid backup must be a readable SQLite file containing our settings table.
  private validateBackup(backupPath: string): void {
    let candidate: Database.Database | null = null;
    try {
      candidate = new Database(backupPath, { readonly: true });
      const row = candidate
        .prepare<[], { count: number }>(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'table' AND name = 'settings'",
        )
        .get();
      if (!row || row.count !== 1) {
        throw new AppError("Not a valid POS backup file", "INVALID_BACKUP");
      }
      const integrity = candidate.pragma("integrity_check", { simple: true });
      if (integrity !== "ok") {
        throw new AppError("Backup file is corrupted", "CORRUPT_BACKUP");
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Not a valid SQLite database", "INVALID_BACKUP");
    } finally {
      candidate?.close();
    }
  }
}
