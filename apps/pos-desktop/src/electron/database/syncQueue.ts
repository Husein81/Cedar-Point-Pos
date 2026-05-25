import { getDatabase } from "./index.js";

export type QueuedOpStatus = "PENDING" | "SYNCING" | "FAILED";

export interface SyncOperationRow {
  localId: string;
  type: string;
  payload: string; // JSON string
  status: QueuedOpStatus;
  retries: number;
  label: string;
  timestamp: number;
}

export function enqueueOperation(op: any) {
  const db = getDatabase();

  const id = op.localId;
  const entityType = "ORDER"; // POS is order-first
  const operationType = op.type;
  const payload = typeof op.payload === "string" ? op.payload : JSON.stringify(op.payload);
  const status = op.status || "PENDING";
  const retries = op.retries || 0;
  const maxRetries = 10;
  const createdAt = op.timestamp || Date.now();
  const updatedAt = Date.now();

  // Extract entityId dynamically
  let entityId = id;
  try {
    const parsed = typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload;
    if (parsed) {
      if (parsed.orderId) {
        entityId = parsed.orderId;
      } else if (parsed.orderDto && parsed.orderDto.id) {
        entityId = parsed.orderDto.id;
      } else if (parsed.orderDto && parsed.orderDto.localId) {
        entityId = parsed.orderDto.localId;
      }
    }
  } catch (e) {
    // safe fallback
  }

  const stmt = db.prepare(`
    INSERT INTO sync_operations (
      id, entityType, operationType, entityId, payload, status, retries, maxRetries, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      retries = excluded.retries,
      updatedAt = excluded.updatedAt
  `);

  stmt.run(id, entityType, operationType, entityId, payload, status, retries, maxRetries, createdAt, updatedAt);
}

export function dequeueOperation(id: string) {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM sync_operations WHERE id = ?");
  stmt.run(id);
}

export function setOperationStatus(id: string, status: QueuedOpStatus) {
  const db = getDatabase();
  const stmt = db.prepare("UPDATE sync_operations SET status = ?, updatedAt = ? WHERE id = ?");
  stmt.run(status, Date.now(), id);
}

export function incrementOperationRetry(id: string) {
  const db = getDatabase();
  const stmt = db.prepare("UPDATE sync_operations SET retries = retries + 1, updatedAt = ? WHERE id = ?");
  stmt.run(Date.now(), id);
}

export function markOperationFailed(id: string) {
  const db = getDatabase();
  const stmt = db.prepare("UPDATE sync_operations SET status = 'FAILED', updatedAt = ? WHERE id = ?");
  stmt.run(Date.now(), id);
}

export function clearFailedOperations() {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM sync_operations WHERE status = 'FAILED'");
  stmt.run();
}

export function getAllOperations(): SyncOperationRow[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM sync_operations ORDER BY createdAt ASC");
  const rows = stmt.all() as any[];

  return rows.map((row) => {
    // Generate dynamic label since database table does not store it
    let label = "Sync Operation";
    if (row.operationType === "CREATE_AND_PAY") {
      label = "Create & Pay Order";
    } else if (row.operationType === "CREATE_AND_CONFIRM") {
      label = "Create & Confirm Order";
    } else if (row.operationType === "UPDATE_ORDER_STATUS") {
      label = "Update Order Status";
    }

    return {
      localId: row.id,
      type: row.operationType,
      payload: row.payload,
      status: row.status,
      retries: row.retries,
      timestamp: row.createdAt,
      label: label,
    };
  });
}
