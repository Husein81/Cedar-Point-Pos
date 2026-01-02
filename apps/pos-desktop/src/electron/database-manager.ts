import Database from "better-sqlite3";
import path from "node:path";
import { app } from "electron";
import fs from "node:fs";
import { SyncService } from "../database/sync-service";

let db: Database.Database | null = null;
let syncService: SyncService | null = null;

/**
 * Initialize SQLite database and SyncService
 */
export function initializeDatabase(
  tenantId: string,
  deviceId: string,
  deviceToken: string,
  branchId: string
): { db: Database.Database; syncService: SyncService } {
  if (db && syncService) {
    return { db, syncService };
  }

  // Get user data path
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, `pos-${tenantId}.db`);

  // Create database
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run schema if first time
  // In dev: app.getAppPath() = project root
  // In prod: app.getAppPath() = resources/app.asar
  let schemaPath: string;
  if (app.isPackaged) {
    // Production: schema should be in resources
    schemaPath = path.join(
      process.resourcesPath,
      "database",
      "sqlite-schema.sql"
    );
  } else {
    // Development: use source path
    schemaPath = path.join(
      app.getAppPath(),
      "src",
      "database",
      "sqlite-schema.sql"
    );
  }

  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schema);
    console.log("✅ Schema applied from:", schemaPath);
  } else {
    console.error("❌ Schema file not found:", schemaPath);
    console.log("📍 Current directory:", __dirname);
    console.log("📍 App path:", app.getAppPath());

    // Fallback: create tables inline
    console.log("⚠️ Using inline schema creation...");
    createSchemaInline(db);
  }

  // Store device metadata
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO device_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `);

  stmt.run("device_id", deviceId);
  stmt.run("tenant_id", tenantId);
  stmt.run("branch_id", branchId);
  stmt.run("device_token", deviceToken);

  // Initialize SyncService
  const apiBaseUrl = "http://localhost:5000";
  syncService = new SyncService(
    db,
    deviceId,
    tenantId,
    deviceToken,
    apiBaseUrl
  );

  console.log("✅ Database initialized:", dbPath);
  console.log("✅ SyncService started");

  return { db, syncService };
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return db;
}

/**
 * Get sync service instance
 */
export function getSyncService(): SyncService {
  if (!syncService) {
    throw new Error(
      "SyncService not initialized. Call initializeDatabase first."
    );
  }
  return syncService;
}

/**
 * Close database and stop sync
 */
export function closeDatabase(): void {
  if (syncService) {
    syncService.stopPeriodicSync();
    syncService = null;
  }

  if (db) {
    db.close();
    db = null;
  }
  console.log("✅ Database closed");
}

/**
 * Create schema inline as a fallback when schema file is not found
 */
function createSchemaInline(db: Database.Database) {
  console.log("[DatabaseManager] Creating schema inline (fallback)");

  const schema = `
-- SQLite Schema for Offline-First POS
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    branch_id TEXT NOT NULL,
    table_id TEXT,
    device_id TEXT NOT NULL,
    customer_id TEXT,
    shift_id TEXT,
    order_number TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    subtotal REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    discount REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_device_sync ON orders(device_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_branch_created ON orders(branch_id, created_at);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id TEXT PRIMARY KEY,
    order_item_id TEXT NOT NULL,
    modifier_id TEXT NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    method TEXT NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'USD',
    amount REAL NOT NULL,
    exchange_rate REAL,
    transaction_id TEXT,
    paid_at TEXT NOT NULL DEFAULT (datetime('now')),
    device_id TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_device_sync ON payments(device_id, sync_status, paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

CREATE TABLE IF NOT EXISTS inventory_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    change_type TEXT NOT NULL,
    before_stock REAL NOT NULL,
    after_stock REAL NOT NULL,
    adjustment REAL NOT NULL,
    before_min_stock REAL,
    after_min_stock REAL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    device_id TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_history_device_sync ON inventory_history(device_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_history_product ON inventory_history(product_id, created_at);

CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    device_id TEXT,
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    end_time TEXT,
    start_cash REAL NOT NULL DEFAULT 0,
    end_cash REAL,
    actual_cash REAL,
    difference REAL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    notes TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shifts_device_sync ON shifts(device_id, sync_status, start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_branch_status ON shifts(branch_id, status);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    device_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local'
);

CREATE INDEX IF NOT EXISTS idx_customers_device_sync ON customers(device_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_device_status ON sync_outbox(device_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity ON sync_outbox(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_tenant_status ON sync_outbox(tenant_id, sync_status);

CREATE TABLE IF NOT EXISTS device_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO device_metadata (key, value) VALUES 
    ('device_token', ''), 
    ('tenant_id', ''), 
    ('branch_id', ''), 
    ('device_id', ''), 
    ('last_sync_time', ''), 
    ('last_full_sync_time', '');

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate REAL NOT NULL,
    is_default INTEGER DEFAULT 0,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    tax_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    barcode TEXT,
    price REAL NOT NULL DEFAULT 0,
    cost REAL DEFAULT 0,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    is_stock_tracked INTEGER DEFAULT 1,
    stock_quantity REAL DEFAULT 0,
    updated_at TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (tax_id) REFERENCES taxes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS modifier_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER DEFAULT 1,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS modifiers (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT,
    FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_modifiers_group ON modifiers(group_id);
`;

  db.exec(schema);
  console.log("[DatabaseManager] Schema created inline successfully");
}
