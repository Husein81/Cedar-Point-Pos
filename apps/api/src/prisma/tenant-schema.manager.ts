// =============================================================================
// TENANT SCHEMA MANAGER
// =============================================================================
//
// This service handles the creation and management of tenant PostgreSQL schemas.
//
// RESPONSIBILITIES:
// - Generate safe schema names (e.g., t_abc123)
// - Create new PostgreSQL schemas for tenants
// - Apply the tenant Prisma schema structure to new schemas
// - Drop/archive tenant schemas (for cleanup)
//
// SUPABASE COMPATIBILITY:
// - Uses standard SQL (CREATE SCHEMA, etc.)
// - No superuser-only operations
// - Works with Supabase's PostgreSQL setup
//
// MIGRATION STRATEGY:
// Since Prisma doesn't natively support multi-schema migrations, we:
// 1. Export the tenant schema DDL from Prisma
// 2. Apply it to each new tenant schema using raw SQL
// 3. Store a "schema version" to track applied migrations
// =============================================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabasePoolService } from './multi-tenant-prisma.service.js';

@Injectable()
export class TenantSchemaManager implements OnModuleInit {
  private readonly logger = new Logger(TenantSchemaManager.name);

  // Cache the tenant schema DDL for creating new schemas
  private tenantSchemaDDL: string | null = null;

  constructor(private readonly dbPool: DatabasePoolService) {}

  async onModuleInit() {
    // Optionally pre-load the schema DDL
    // await this.loadTenantSchemaDDL();
  }

  /**
   * Generate a safe PostgreSQL schema name from a tenant ID.
   * Format: t_<first 8 chars of cuid>
   *
   * Requirements:
   * - Must start with a letter (we use 't_' prefix)
   * - Only lowercase letters, numbers, underscores
   * - Max 63 characters (PostgreSQL limit)
   */
  generateSchemaName(tenantId: string): string {
    // Use first 8 characters of the tenant ID (cuid is 25 chars)
    const shortId = tenantId.substring(0, 8).toLowerCase();

    // Ensure only alphanumeric characters
    const sanitized = shortId.replace(/[^a-z0-9]/g, '');

    return `t_${sanitized}`;
  }

  /**
   * Validate a schema name to prevent SQL injection.
   */
  isValidSchemaName(schemaName: string): boolean {
    // Must match pattern: t_ followed by alphanumeric
    return /^t_[a-z0-9]+$/.test(schemaName);
  }

  /**
   * Check if a schema exists in the database.
   */
  async schemaExists(schemaName: string): Promise<boolean> {
    if (!this.isValidSchemaName(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    const result = await this.dbPool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = $1
      ) as exists`,
      [schemaName],
    );

    return result[0]?.exists ?? false;
  }

  /**
   * Create a new PostgreSQL schema for a tenant.
   * This creates an empty schema that needs to have tables applied.
   */
  async createSchema(schemaName: string): Promise<void> {
    if (!this.isValidSchemaName(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    // Check if schema already exists
    if (await this.schemaExists(schemaName)) {
      this.logger.warn(`Schema ${schemaName} already exists`);
      return;
    }

    this.logger.log(`Creating schema: ${schemaName}`);

    // Create the schema
    await this.dbPool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    this.logger.log(`Schema ${schemaName} created successfully`);
  }

  /**
   * Apply the tenant schema structure (tables, indexes, etc.) to a schema.
   * This is called after createSchema to set up all the tables.
   */
  async applyTenantSchema(schemaName: string): Promise<void> {
    if (!this.isValidSchemaName(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    this.logger.log(`Applying tenant schema structure to: ${schemaName}`);

    const client = await this.dbPool.getClient();

    try {
      // Set search_path to the target schema
      await client.query(`SET search_path TO "${schemaName}"`);

      // Apply the tenant schema DDL
      const ddl = this.getTenantSchemaDDL();

      // Split and execute statements (simplified - production should use proper parsing)
      // For now, we execute the entire DDL as one block
      await client.query(ddl);

      this.logger.log(`Tenant schema applied to ${schemaName}`);
    } finally {
      // Reset search_path and release client
      await client.query('SET search_path TO public');
      client.release();
    }
  }

  /**
   * Get the DDL for creating tenant schema tables.
   * This is generated from the tenant.prisma schema.
   *
   * In production, you would either:
   * 1. Pre-generate this with `prisma migrate diff`
   * 2. Use Prisma's migration system with custom schema support
   * 3. Maintain a separate SQL file
   */
  private getTenantSchemaDDL(): string {
    if (this.tenantSchemaDDL) {
      return this.tenantSchemaDDL;
    }

    // For now, return inline DDL (in production, load from file or generate)
    // This DDL matches the tenant.prisma schema
    this.tenantSchemaDDL = `
-- =============================================================================
-- TENANT SCHEMA DDL
-- Generated from tenant.prisma
-- =============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryChangeType" AS ENUM ('SET_STOCK', 'ADJUST_STOCK', 'SET_MIN_STOCK', 'ORDER_DEDUCT', 'ORDER_RETURN', 'MANUAL_ADJUST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'SENT_TO_KITCHEN', 'READY', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'CREDIT', 'VOUCHER', 'ONLINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ModifierType" AS ENUM ('SINGLE', 'MULTIPLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'CASHIER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Branches
CREATE TABLE IF NOT EXISTS "Branch" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- POS Devices
CREATE TABLE IF NOT EXISTS "POSDevice" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "lastSync" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isKDS" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "POSDevice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "POSDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "POSDevice_token_key" ON "POSDevice"("token");

-- Categories
CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Category_code_key" ON "Category"("code");

-- Subcategories
CREATE TABLE IF NOT EXISTS "Subcategory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Taxes
CREATE TABLE IF NOT EXISTS "Tax" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "rate" DECIMAL(5,2) NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- Products
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "sku" TEXT,
  "barcode" TEXT,
  "price" DECIMAL(10,2) DEFAULT 0,
  "cost" DECIMAL(10,2) DEFAULT 0,
  "categoryId" TEXT,
  "subcategoryId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "isIngredient" BOOLEAN NOT NULL DEFAULT false,
  "isModifiable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "taxId" TEXT,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Product_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode");

-- Currencies
CREATE TABLE IF NOT EXISTS "Currency" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT,
  "exchangeRate" DECIMAL(10,2),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- Customers
CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- Tables
CREATE TABLE IF NOT EXISTS "Table" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tableNumber" INTEGER NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 4,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Table_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Table_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Shifts
CREATE TABLE IF NOT EXISTS "Shift" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "branchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endTime" TIMESTAMP(3),
  "startCash" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "endCash" DECIMAL(10,2),
  "actualCash" DECIMAL(10,2),
  "difference" DECIMAL(10,2),
  "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  CONSTRAINT "Shift_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Shift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Shift_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "POSDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Shift_branchId_status_idx" ON "Shift"("branchId", "status");

-- Orders
CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT,
  "branchId" TEXT NOT NULL,
  "tableId" TEXT,
  "deviceId" TEXT,
  "customerId" TEXT,
  "shiftId" TEXT,
  "orderNumber" TEXT,
  "type" "OrderType" NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(10,2) DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Order_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "POSDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Order_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Order_branchId_createdAt_idx" ON "Order"("branchId", "createdAt");

-- Order Items
CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(10,4) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "taxRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL,
  "notes" TEXT,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Modifier Groups
CREATE TABLE IF NOT EXISTS "ModifierGroup" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "type" "ModifierType" NOT NULL,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- Modifiers
CREATE TABLE IF NOT EXISTS "Modifier" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "groupId" TEXT NOT NULL,
  "productId" TEXT,
  "name" TEXT NOT NULL,
  "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Modifier_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Modifier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Order Item Modifiers
CREATE TABLE IF NOT EXISTS "OrderItemModifier" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orderItemId" TEXT NOT NULL,
  "modifierId" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "OrderItemModifier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItemModifier_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "Modifier"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Order Item Tickets (KDS)
CREATE TABLE IF NOT EXISTS "OrderItemTicket" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orderItemId" TEXT NOT NULL,
  "station" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'SENT_TO_KITCHEN',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bumpedAt" TIMESTAMP(3),
  CONSTRAINT "OrderItemTicket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItemTicket_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Payments
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orderId" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'USD',
  "amount" DECIMAL(65,30) NOT NULL,
  "exchangeRate" DECIMAL(65,30),
  "transactionId" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Payment_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Inventory
CREATE TABLE IF NOT EXISTS "Inventory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "branchId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "stock" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "minStock" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "lastAdjusted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Inventory_branchId_productId_key" ON "Inventory"("branchId", "productId");

-- Inventory History
CREATE TABLE IF NOT EXISTS "InventoryHistory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "branchId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "changeType" "InventoryChangeType" NOT NULL,
  "beforeStock" DECIMAL(10,4) NOT NULL,
  "afterStock" DECIMAL(10,4) NOT NULL,
  "adjustment" DECIMAL(10,4) NOT NULL,
  "beforeMinStock" DECIMAL(10,4),
  "afterMinStock" DECIMAL(10,4),
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryHistory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "InventoryHistory_branchId_createdAt_idx" ON "InventoryHistory"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryHistory_productId_createdAt_idx" ON "InventoryHistory"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryHistory_userId_createdAt_idx" ON "InventoryHistory"("userId", "createdAt");

-- Transfers
CREATE TABLE IF NOT EXISTS "Transfer" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "fromBranchId" TEXT NOT NULL,
  "toBranchId" TEXT NOT NULL,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Transfer_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transfer_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transfer_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transfer_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Transfer_status_idx" ON "Transfer"("status");
CREATE INDEX IF NOT EXISTS "Transfer_fromBranchId_idx" ON "Transfer"("fromBranchId");
CREATE INDEX IF NOT EXISTS "Transfer_toBranchId_idx" ON "Transfer"("toBranchId");

-- Transfer Items
CREATE TABLE IF NOT EXISTS "TransferItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "transferId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(10,4) NOT NULL,
  CONSTRAINT "TransferItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TransferItem_transferId_productId_key" ON "TransferItem"("transferId", "productId");

-- Refunds
CREATE TABLE IF NOT EXISTS "Refund" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orderId" TEXT NOT NULL,
  "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "reason" TEXT,
  "refundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Refund Items
CREATE TABLE IF NOT EXISTS "RefundItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "refundId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "quantity" DECIMAL(10,4) NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "RefundItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefundItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RefundItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RefundItem_refundId_orderItemId_key" ON "RefundItem"("refundId", "orderItemId");
CREATE INDEX IF NOT EXISTS "RefundItem_orderItemId_idx" ON "RefundItem"("orderItemId");

-- Recipes
CREATE TABLE IF NOT EXISTS "Recipe" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "productId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "quantity" DECIMAL(10,4) NOT NULL,
  CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Recipe_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Recipe_productId_ingredientId_key" ON "Recipe"("productId", "ingredientId");

-- Offers
CREATE TABLE IF NOT EXISTS "Offer" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "basePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- Offer Groups
CREATE TABLE IF NOT EXISTS "OfferGroup" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "offerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "freeItemsCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OfferGroup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfferGroup_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Offer Group Items
CREATE TABLE IF NOT EXISTS "OfferGroupItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "offerGroupId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "extraPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT "OfferGroupItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfferGroupItem_offerGroupId_fkey" FOREIGN KEY ("offerGroupId") REFERENCES "OfferGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfferGroupItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS "_SchemaVersion" (
  "version" INTEGER NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "_SchemaVersion_pkey" PRIMARY KEY ("version")
);
INSERT INTO "_SchemaVersion" ("version") VALUES (1) ON CONFLICT DO NOTHING;
    `;

    return this.tenantSchemaDDL;
  }

  /**
   * Drop a tenant schema (USE WITH CAUTION).
   * This is a destructive operation that removes all tenant data.
   */
  async dropSchema(schemaName: string): Promise<void> {
    if (!this.isValidSchemaName(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    this.logger.warn(`Dropping schema: ${schemaName}`);

    await this.dbPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

    this.logger.log(`Schema ${schemaName} dropped`);
  }

  /**
   * List all tenant schemas in the database.
   */
  async listTenantSchemas(): Promise<string[]> {
    const result = await this.dbPool.query<{ schema_name: string }>(
      `SELECT schema_name 
       FROM information_schema.schemata 
       WHERE schema_name LIKE 't_%'
       ORDER BY schema_name`,
    );

    return result.map((row) => row.schema_name);
  }
}
