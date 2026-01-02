/**
 * Offline-First Sync Service for Electron POS
 *
 * This service handles:
 * - Detecting network connectivity
 * - Queueing local changes to SyncOutbox
 * - Batching and sending changes to server
 * - Handling sync responses and updating local state
 * - Retry logic for failed syncs
 * - Conflict detection and resolution
 */

import { Database } from "better-sqlite3";

import type {
  Customer,
  InventoryHistory,
  Order,
  Payment,
  Shift,
} from "@repo/types";
export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";
export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";
export type EntityType =
  | "Order"
  | "Payment"
  | "InventoryHistory"
  | "Shift"
  | "Customer";

export interface SyncOutboxRecord {
  id: string;
  tenantId: string;
  deviceId: string;
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  payload: string; // JSON string
  syncStatus: SyncStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  syncedAt: string | null;
}

export interface SyncBatch {
  orders?: Order[];
  payments?: Payment[];
  inventoryHistory?: InventoryHistory[];
  shifts?: Shift[];
  customers?: Customer[];
}

export interface SyncResponse {
  success: boolean;
  synced: {
    orders?: string[];
    payments?: string[];
    inventoryHistory?: string[];
    shifts?: string[];
    customers?: string[];
  };
  conflicts: {
    orders?: string[];
    payments?: string[];
    inventoryHistory?: string[];
    shifts?: string[];
    customers?: string[];
  };
  errors?: Array<{
    entityType: EntityType;
    entityId: string;
    error: string;
  }>;
}

export class SyncService {
  private db: Database;
  private deviceId: string;
  private tenantId: string;
  private deviceToken: string;
  private apiBaseUrl: string;
  private isOnline: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private maxRetries: number = 5;
  private batchSize: number = 50;

  constructor(
    db: Database,
    deviceId: string,
    tenantId: string,
    deviceToken: string,
    apiBaseUrl: string
  ) {
    this.db = db;
    this.deviceId = deviceId;
    this.tenantId = tenantId;
    this.deviceToken = deviceToken;
    this.apiBaseUrl = apiBaseUrl;

    // Initialize network monitoring
    this.startNetworkMonitoring();

    // Start periodic sync (every 30 seconds when online)
    this.startPeriodicSync();
  }

  /**
   * Queue a local change to the sync outbox
   */
  queueChange(
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    payload: unknown
  ): void {
    const outboxId = crypto.randomUUID();
    const payloadJson = JSON.stringify(payload);

    const stmt = this.db.prepare(`
      INSERT INTO sync_outbox (
        id, tenant_id, device_id, entity_type, entity_id,
        operation, payload, sync_status, retry_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, datetime('now'))
    `);

    stmt.run(
      outboxId,
      this.tenantId,
      this.deviceId,
      entityType,
      entityId,
      operation,
      payloadJson
    );

    // Update entity's sync_status
    this.updateEntitySyncStatus(entityType, entityId, "PENDING");

    // Try immediate sync if online
    if (this.isOnline) {
      this.syncPendingChanges().catch((err) => {
        console.error("Immediate sync failed:", err);
      });
    }
  }

  /**
   * Update entity sync status in the main table
   */
  private updateEntitySyncStatus(
    entityType: EntityType,
    entityId: string,
    status: SyncStatus
  ): void {
    const tableMap: Record<EntityType, string> = {
      Order: "orders",
      Payment: "payments",
      InventoryHistory: "inventory_history",
      Shift: "shifts",
      Customer: "customers",
    };

    const table = tableMap[entityType];
    if (!table) return;

    const stmt = this.db.prepare(`
      UPDATE ${table}
      SET sync_status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(status, entityId);
  }

  /**
   * Get pending sync records from outbox
   */
  private getPendingSyncRecords(
    limit: number = this.batchSize
  ): SyncOutboxRecord[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, tenant_id as tenantId, device_id as deviceId,
        entity_type as entityType, entity_id as entityId,
        operation, payload, sync_status as syncStatus,
        retry_count as retryCount, last_error as lastError,
        created_at as createdAt, synced_at as syncedAt
      FROM sync_outbox
      WHERE sync_status = 'PENDING'
        AND retry_count < ?
      ORDER BY created_at ASC
      LIMIT ?
    `);

    return stmt.all(this.maxRetries, limit) as SyncOutboxRecord[];
  }

  /**
   * Build sync batch from outbox records
   */
  private buildSyncBatch(records: SyncOutboxRecord[]): SyncBatch {
    const batch: SyncBatch = {};

    for (const record of records) {
      const payload = JSON.parse(record.payload);

      switch (record.entityType) {
        case "Order":
          if (!batch.orders) batch.orders = [];
          batch.orders.push(payload);
          break;
        case "Payment":
          if (!batch.payments) batch.payments = [];
          batch.payments.push(payload);
          break;
        case "InventoryHistory":
          if (!batch.inventoryHistory) batch.inventoryHistory = [];
          batch.inventoryHistory.push(payload);
          break;
        case "Shift":
          if (!batch.shifts) batch.shifts = [];
          batch.shifts.push(payload);
          break;
        case "Customer":
          if (!batch.customers) batch.customers = [];
          batch.customers.push(payload);
          break;
      }
    }

    return batch;
  }

  /**
   * Send sync batch to server
   */
  private async sendSyncBatch(batch: SyncBatch): Promise<SyncResponse> {
    const response = await fetch(`${this.apiBaseUrl}/sync/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Token": this.deviceToken,
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Process sync response and update local state
   */
  private processSyncResponse(
    records: SyncOutboxRecord[],
    response: SyncResponse
  ): void {
    const transaction = this.db.transaction(() => {
      for (const record of records) {
        const syncedIds = response.synced[
          record.entityType.toLowerCase() as keyof typeof response.synced
        ] as string[] | undefined;
        const conflictIds = response.conflicts[
          record.entityType.toLowerCase() as keyof typeof response.conflicts
        ] as string[] | undefined;
        const errors = response.errors?.filter(
          (e) =>
            e.entityType === record.entityType && e.entityId === record.entityId
        );

        if (syncedIds?.includes(record.entityId)) {
          // Mark as synced
          this.db
            .prepare(
              `
            UPDATE sync_outbox
            SET sync_status = 'SYNCED', synced_at = datetime('now')
            WHERE id = ?
          `
            )
            .run(record.id);

          this.updateEntitySyncStatus(
            record.entityType,
            record.entityId,
            "SYNCED"
          );

          // Update synced_at timestamp
          this.updateEntitySyncedAt(record.entityType, record.entityId);
        } else if (conflictIds?.includes(record.entityId) || errors?.length) {
          // Mark as failed (conflict or error)
          const error = errors?.[0]?.error || "Conflict detected";
          this.db
            .prepare(
              `
            UPDATE sync_outbox
            SET sync_status = 'FAILED', last_error = ?, retry_count = retry_count + 1
            WHERE id = ?
          `
            )
            .run(error, record.id);

          this.updateEntitySyncStatus(
            record.entityType,
            record.entityId,
            "FAILED"
          );
        }
      }
    });

    transaction();
  }

  /**
   * Update entity's synced_at timestamp
   */
  private updateEntitySyncedAt(entityType: EntityType, entityId: string): void {
    const tableMap: Record<EntityType, string> = {
      Order: "orders",
      Payment: "payments",
      InventoryHistory: "inventory_history",
      Shift: "shifts",
      Customer: "customers",
    };

    const table = tableMap[entityType];
    if (!table) return;

    const stmt = this.db.prepare(`
      UPDATE ${table}
      SET synced_at = datetime('now'), source = 'server'
      WHERE id = ?
    `);

    stmt.run(entityId);
  }

  /**
   * Sync pending changes to server
   */
  async syncPendingChanges(): Promise<void> {
    if (!this.isOnline) {
      console.log("Offline - skipping sync");
      return;
    }

    const records = this.getPendingSyncRecords();
    if (records.length === 0) {
      return;
    }

    console.log(`Syncing ${records.length} pending changes...`);

    try {
      const batch = this.buildSyncBatch(records);
      const response = await this.sendSyncBatch(batch);
      this.processSyncResponse(records, response);

      // Update last sync time
      this.updateLastSyncTime();
    } catch (error) {
      console.error("Sync error:", error);

      // Mark records as failed and increment retry count
      const transaction = this.db.transaction(() => {
        for (const record of records) {
          this.db
            .prepare(
              `
            UPDATE sync_outbox
            SET sync_status = 'FAILED', 
                last_error = ?,
                retry_count = retry_count + 1
            WHERE id = ?
          `
            )
            .run(String(error), record.id);

          this.updateEntitySyncStatus(
            record.entityType,
            record.entityId,
            "FAILED"
          );
        }
      });

      transaction();

      throw error;
    }
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring(): void {
    // Check online status
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        console.log("Network online - starting sync");
        this.syncPendingChanges().catch(console.error);
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
        console.log("Network offline");
      });
    }

    // Periodic connectivity check (every 5 seconds)
    setInterval(() => {
      this.checkConnectivity();
    }, 5000);
  }

  /**
   * Check connectivity by pinging the API
   */
  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        method: "GET",
        headers: {
          "X-Device-Token": this.deviceToken,
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingChanges().catch(console.error);
        this.pullUpdates().catch(console.error);
      }
    }, 30000);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Update last sync time in device metadata
   */
  private updateLastSyncTime(): void {
    this.db
      .prepare(
        `
      UPDATE device_metadata
      SET value = datetime('now'), updated_at = datetime('now')
      WHERE key = 'last_sync_time'
    `
      )
      .run();
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    pending: number;
    synced: number;
    failed: number;
  } {
    const stmt = this.db.prepare(`
      SELECT 
        sync_status,
        COUNT(*) as count
      FROM sync_outbox
      GROUP BY sync_status
    `);

    const results = stmt.all() as Array<{
      sync_status: SyncStatus;
      count: number;
    }>;

    const stats = {
      pending: 0,
      synced: 0,
      failed: 0,
    };

    for (const row of results) {
      stats[row.sync_status.toLowerCase() as keyof typeof stats] = row.count;
    }

    return stats;
  }

  /**
   * Retry failed syncs
   */
  async retryFailedSyncs(): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE sync_outbox
      SET sync_status = 'PENDING', retry_count = 0
      WHERE sync_status = 'FAILED' AND retry_count < ?
    `);

    stmt.run(this.maxRetries);

    // Trigger sync
    await this.syncPendingChanges();
  }

  /**
   * Pull updates from server
   */
  async pullUpdates(): Promise<void> {
    if (!this.isOnline) return;

    // Get last sync time
    const stmt = this.db.prepare(
      "SELECT value FROM device_metadata WHERE key = 'last_full_sync_time'"
    );
    const row = stmt.get() as { value: string } | undefined;
    const lastSyncTime = row?.value || "";

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/sync/pull?lastSyncTime=${encodeURIComponent(
          lastSyncTime
        )}`,
        {
          method: "POST",
          headers: {
            "X-Device-Token": this.deviceToken,
          },
        }
      );

      if (!response.ok) return;

      const batch = (await response.json()) as SyncBatch;

      if (
        (batch.customers && batch.customers.length > 0) ||
        (batch.shifts && batch.shifts.length > 0)
      ) {
        console.log("Received pull updates:", {
          customers: batch.customers?.length,
          shifts: batch.shifts?.length,
        });
        this.processPullBatch(batch);

        // Update last sync time
        this.db
          .prepare(
            "UPDATE device_metadata SET value = datetime('now'), updated_at = datetime('now') WHERE key = 'last_full_sync_time'"
          )
          .run();
      }
    } catch (error) {
      console.error("Pull failed:", error);
    }
  }

  /**
   * Process pulled updates
   */
  private processPullBatch(batch: SyncBatch): void {
    const processCustomers = this.db.transaction((customers: Customer[]) => {
      const stmt = this.db.prepare(`
        INSERT INTO customers (
          id, tenant_id, name, email, phone, address, 
          created_at, updated_at, sync_status, synced_at, source
        ) VALUES (
          @id, @tenantId, @name, @email, @phone, @address,
          @createdAt, @updatedAt, 'SYNCED', datetime('now'), 'server'
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          phone = excluded.phone,
          address = excluded.address,
          updated_at = excluded.updated_at,
          sync_status = 'SYNCED',
          synced_at = datetime('now'),
          source = 'server'
      `);
      for (const c of customers) stmt.run(c);
    });

    const processShifts = this.db.transaction((shifts: Shift[]) => {
      const stmt = this.db.prepare(`
        INSERT INTO shifts (
          id, tenant_id, branch_id, user_id, device_id,
          start_time, end_time, start_cash, end_cash,
          actual_cash, difference, status, notes,
          sync_status, synced_at, source, updated_at
        ) VALUES (
          @id, @tenantId, @branchId, @userId, @deviceId,
          @startTime, @endTime, @startCash, @endCash,
          @actualCash, @difference, @status, @notes,
          'SYNCED', datetime('now'), 'server', datetime('now')
        )
        ON CONFLICT(id) DO UPDATE SET
          end_time = excluded.end_time,
          end_cash = excluded.end_cash,
          actual_cash = excluded.actual_cash,
          difference = excluded.difference,
          status = excluded.status,
          notes = excluded.notes,
          sync_status = 'SYNCED',
          synced_at = datetime('now'),
          source = 'server',
          updated_at = datetime('now')
      `);
      for (const s of shifts) stmt.run(s);
    });

    if (batch.customers?.length) processCustomers(batch.customers);
    if (batch.shifts?.length) processShifts(batch.shifts);
  }
}
