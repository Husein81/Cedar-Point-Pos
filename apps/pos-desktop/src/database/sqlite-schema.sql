-- SQLite Schema for Offline-First POS
-- This schema mirrors PostgreSQL but includes sync metadata

-- Sync Status Enum (stored as TEXT)
-- PENDING | SYNCED | FAILED

-- Sync Operation Enum (stored as TEXT)
-- CREATE | UPDATE | DELETE

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, -- UUID generated offline
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    branch_id TEXT NOT NULL,
    table_id TEXT,
    device_id TEXT NOT NULL, -- Device that created this order
    customer_id TEXT,
    shift_id TEXT,
    order_number TEXT,
    type TEXT NOT NULL, -- DINE_IN, TAKEAWAY, DELIVERY
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING, SENT_TO_KITCHEN, READY, COMPLETED, CANCELLED
    
    -- Financial fields
    subtotal REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    discount REAL,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    
    -- Sync metadata
    sync_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | SYNCED | FAILED
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local', -- 'local' or 'server'
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_device_sync ON orders(device_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_branch_created ON orders(branch_id, created_at);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
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

-- ============================================
-- ORDER ITEM MODIFIERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id TEXT PRIMARY KEY,
    order_item_id TEXT NOT NULL,
    modifier_id TEXT NOT NULL,
    price REAL NOT NULL,
    
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY, -- UUID generated offline
    order_id TEXT NOT NULL,
    method TEXT NOT NULL, -- CASH, CARD, CREDIT, VOUCHER, ONLINE
    currency_code TEXT NOT NULL DEFAULT 'USD',
    amount REAL NOT NULL,
    exchange_rate REAL,
    transaction_id TEXT,
    paid_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Sync metadata
    device_id TEXT NOT NULL, -- Device that created this payment
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_device_sync ON payments(device_id, sync_status, paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- ============================================
-- INVENTORY HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_history (
    id TEXT PRIMARY KEY, -- UUID generated offline
    tenant_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    change_type TEXT NOT NULL, -- SET_STOCK, ADJUST_STOCK, ORDER_DEDUCT, ORDER_RETURN, etc.
    before_stock REAL NOT NULL,
    after_stock REAL NOT NULL,
    adjustment REAL NOT NULL, -- after_stock - before_stock
    before_min_stock REAL,
    after_min_stock REAL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Sync metadata
    device_id TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_history_device_sync ON inventory_history(device_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_history_product ON inventory_history(product_id, created_at);

-- ============================================
-- SHIFTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY, -- UUID generated offline
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
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | CLOSED
    notes TEXT,
    
    -- Sync metadata
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shifts_device_sync ON shifts(device_id, sync_status, start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_branch_status ON shifts(branch_id, status);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, -- UUID generated offline
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Sync metadata
    device_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    source TEXT DEFAULT 'local'
);

CREATE INDEX IF NOT EXISTS idx_customers_device_sync ON customers(device_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

-- ============================================
-- SYNC OUTBOX TABLE (Critical for Offline Sync)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY, -- UUID
    tenant_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'Order', 'Payment', 'InventoryHistory', 'Shift', 'Customer'
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    payload TEXT NOT NULL, -- JSON string of entity data
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_device_status ON sync_outbox(device_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity ON sync_outbox(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_tenant_status ON sync_outbox(tenant_id, sync_status);

-- ============================================
-- DEVICE METADATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS device_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Store device token, tenant_id, branch_id, last_sync_time, etc.
INSERT OR IGNORE INTO device_metadata (key, value) VALUES \
    ('device_token', ''), 
    ('tenant_id', ''), 
    ('branch_id', ''), 
    ('device_id', ''), 
    ('last_sync_time', ''), 
    ('last_full_sync_time', '');

-- ============================================
-- READ-ONLY DATA (Synced from Server)
-- ============================================

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1, -- Boolean
    updated_at TEXT
);

-- TAXES
CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate REAL NOT NULL, -- Percentage (e.g., 11.0 for 11%)
    is_default INTEGER DEFAULT 0, -- Boolean
    updated_at TEXT
);

-- PRODUCTS
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
    is_active INTEGER DEFAULT 1, -- Boolean
    is_stock_tracked INTEGER DEFAULT 1, -- Boolean
    stock_quantity REAL DEFAULT 0,
    updated_at TEXT,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (tax_id) REFERENCES taxes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- MODIFIER GROUPS
CREATE TABLE IF NOT EXISTS modifier_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER DEFAULT 1,
    updated_at TEXT
);

-- MODIFIERS
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

-- PRODUCT MODIFIERS (Link table if needed, or simple query)
-- For now we assume relational linking via application logic or extended schema if M-to-M