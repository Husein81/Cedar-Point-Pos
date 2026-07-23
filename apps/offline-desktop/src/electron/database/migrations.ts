import type Database from "better-sqlite3";

// Versioned migrations keyed by PRAGMA user_version.
// Append-only: never edit a shipped migration — add a new one.
// This is also the future hook for sync metadata columns (updatedAt is
// already on every row; adding a syncedAt/dirty flag later is one migration).

type Migration = {
  version: number;
  up: (db: Database.Database) => void;
};

const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE COLLATE NOCASE,
          passwordHash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('OWNER','MANAGER','CASHIER')),
          isActive INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );

        CREATE TABLE categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0,
          deletedAt TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE INDEX idx_categories_deleted ON categories(deletedAt);

        CREATE TABLE products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sku TEXT,
          barcode TEXT,
          price REAL NOT NULL DEFAULT 0,
          cost REAL NOT NULL DEFAULT 0,
          stock REAL NOT NULL DEFAULT 0,
          trackInventory INTEGER NOT NULL DEFAULT 1,
          lowStockThreshold REAL,
          categoryId TEXT REFERENCES categories(id),
          imagePath TEXT,
          isActive INTEGER NOT NULL DEFAULT 1,
          deletedAt TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE INDEX idx_products_name ON products(name);
        CREATE INDEX idx_products_barcode ON products(barcode);
        CREATE INDEX idx_products_sku ON products(sku);
        CREATE INDEX idx_products_category ON products(categoryId);
        CREATE INDEX idx_products_deleted ON products(deletedAt);

        CREATE TABLE customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          loyaltyPoints REAL NOT NULL DEFAULT 0,
          deletedAt TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE INDEX idx_customers_name ON customers(name);
        CREATE INDEX idx_customers_phone ON customers(phone);
        CREATE INDEX idx_customers_deleted ON customers(deletedAt);

        CREATE TABLE shifts (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL REFERENCES users(id),
          status TEXT NOT NULL CHECK (status IN ('OPEN','CLOSED')),
          openingFloat REAL NOT NULL DEFAULT 0,
          expectedCash REAL,
          actualCash REAL,
          difference REAL,
          note TEXT,
          openedAt TEXT NOT NULL,
          closedAt TEXT
        );
        CREATE INDEX idx_shifts_status ON shifts(status);

        CREATE TABLE cash_movements (
          id TEXT PRIMARY KEY,
          shiftId TEXT NOT NULL REFERENCES shifts(id),
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          reason TEXT,
          userId TEXT REFERENCES users(id),
          createdAt TEXT NOT NULL
        );
        CREATE INDEX idx_cash_movements_shift ON cash_movements(shiftId);

        CREATE TABLE orders (
          id TEXT PRIMARY KEY,
          orderNumber TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL,
          customerId TEXT REFERENCES customers(id),
          userId TEXT NOT NULL REFERENCES users(id),
          shiftId TEXT REFERENCES shifts(id),
          subtotal REAL NOT NULL DEFAULT 0,
          discountType TEXT,
          discountValue REAL NOT NULL DEFAULT 0,
          discountAmount REAL NOT NULL DEFAULT 0,
          taxRate REAL NOT NULL DEFAULT 0,
          taxAmount REAL NOT NULL DEFAULT 0,
          total REAL NOT NULL DEFAULT 0,
          amountPaid REAL NOT NULL DEFAULT 0,
          changeDue REAL NOT NULL DEFAULT 0,
          note TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          completedAt TEXT
        );
        CREATE INDEX idx_orders_status ON orders(status);
        CREATE INDEX idx_orders_created ON orders(createdAt);
        CREATE INDEX idx_orders_number ON orders(orderNumber);
        CREATE INDEX idx_orders_customer ON orders(customerId);
        CREATE INDEX idx_orders_shift ON orders(shiftId);

        CREATE TABLE order_items (
          id TEXT PRIMARY KEY,
          orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          productId TEXT REFERENCES products(id),
          productName TEXT NOT NULL,
          quantity REAL NOT NULL,
          unitPrice REAL NOT NULL,
          discountType TEXT,
          discountValue REAL NOT NULL DEFAULT 0,
          lineTotal REAL NOT NULL,
          refundedQuantity REAL NOT NULL DEFAULT 0,
          note TEXT
        );
        CREATE INDEX idx_order_items_order ON order_items(orderId);
        CREATE INDEX idx_order_items_product ON order_items(productId);

        CREATE TABLE payments (
          id TEXT PRIMARY KEY,
          orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          method TEXT NOT NULL,
          amount REAL NOT NULL,
          createdAt TEXT NOT NULL
        );
        CREATE INDEX idx_payments_order ON payments(orderId);

        CREATE TABLE refunds (
          id TEXT PRIMARY KEY,
          orderId TEXT NOT NULL REFERENCES orders(id),
          amount REAL NOT NULL,
          reason TEXT,
          userId TEXT REFERENCES users(id),
          createdAt TEXT NOT NULL
        );
        CREATE INDEX idx_refunds_order ON refunds(orderId);

        CREATE TABLE stock_movements (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL REFERENCES products(id),
          type TEXT NOT NULL,
          quantity REAL NOT NULL,
          unitCost REAL,
          reason TEXT,
          userId TEXT REFERENCES users(id),
          createdAt TEXT NOT NULL
        );
        CREATE INDEX idx_stock_movements_product ON stock_movements(productId);
        CREATE INDEX idx_stock_movements_created ON stock_movements(createdAt);

        -- Single-row settings table (id is always 1).
        CREATE TABLE settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          businessName TEXT NOT NULL DEFAULT 'My Business',
          phone TEXT,
          email TEXT,
          address TEXT,
          currencyCode TEXT NOT NULL DEFAULT 'USD',
          currencySymbol TEXT NOT NULL DEFAULT '$',
          receiptFooter TEXT,
          taxRate REAL NOT NULL DEFAULT 0,
          logoPath TEXT,
          invoicePrefix TEXT NOT NULL DEFAULT 'INV-',
          nextInvoiceNumber INTEGER NOT NULL DEFAULT 1,
          printerName TEXT,
          receiptWidthMm INTEGER NOT NULL DEFAULT 80,
          theme TEXT NOT NULL DEFAULT 'system'
        );
        INSERT INTO settings (id) VALUES (1);
      `);
    },
  },
  {
    version: 2,
    up: (db) => {
      db.exec(`
        -- Reusable named-color palette, picked when setting a category's color.
        CREATE TABLE colors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          hex TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE UNIQUE INDEX idx_colors_name ON colors(name);
      `);
    },
  },
  {
    version: 3,
    up: (db) => {
      // categories.color (free-typed hex string) is superseded by a proper FK
      // into the shared colors palette. The old column is left in place
      // (unused) rather than dropped — SQLite drop-column requires a full
      // table rebuild, which isn't worth the risk for a column nothing reads.
      db.exec(`
        ALTER TABLE categories ADD COLUMN colorId TEXT REFERENCES colors(id);
        CREATE INDEX idx_categories_color ON categories(colorId);
      `);
    },
  },
];

export function runMigrations(db: Database.Database) {
  const current = db.pragma("user_version", { simple: true }) as number;

  const pending = migrations
    .filter((migration) => migration.version > current)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    const apply = db.transaction(() => {
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    });
    apply();
  }
}
