# Schema-Based Multi-Tenancy Architecture

## Overview

This document describes the schema-based multi-tenancy architecture implemented for the Pointverse POS system. Instead of using `tenantId` columns in every table (row-based multi-tenancy), we use PostgreSQL schemas to isolate tenant data.

## Architecture Layers

### 1. System Layer (Public Schema)

The `public` schema contains global tables shared across all tenants:

| Table            | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `Tenant`         | Master registry of all tenants and their schema names |
| `License`        | Subscription/licensing information per tenant         |
| `SystemDevice`   | Device activation and licensing (system-level)        |
| `SystemAuditLog` | System-wide administrative audit trail                |

**Schema File:** `prisma/system.prisma`

**Generated Client:** `generated/prisma-system/`

### 2. Tenant Layer (Per-Tenant Schemas)

Each tenant gets their own PostgreSQL schema (e.g., `t_abc123`) containing all business data:

- Users, Branches, Products, Categories
- Inventory, Transfers, Recipes
- Orders, Payments, Refunds
- Tables, Shifts, Customers
- Modifiers, Offers

**Key Difference:** No `tenantId` columns! Isolation is enforced at the schema level.

**Schema File:** `prisma/tenant.prisma`

**Generated Client:** `generated/prisma-tenant/`

## How Schema Routing Works

```
┌──────────────────────────────────────────────────────────────────┐
│                        Incoming Request                          │
│                    (JWT with tenantId claim)                     │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   TenantContextMiddleware                        │
│  1. Extract tenantId from JWT/header                             │
│  2. Look up schemaName from Tenant table                         │
│  3. Attach { tenantId, schemaName } to request                   │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    TenantPrismaService                           │
│  1. Read tenantContext from request                              │
│  2. Execute: SET search_path TO "t_abc123", public               │
│  3. All Prisma queries now run against tenant's schema           │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   public    │  │  t_abc123   │  │  t_def456   │              │
│  │  (system)   │  │ (tenant 1)  │  │ (tenant 2)  │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ Tenant      │  │ User        │  │ User        │              │
│  │ License     │  │ Branch      │  │ Branch      │              │
│  │ SystemDevice│  │ Product     │  │ Product     │              │
│  │ ...         │  │ Order       │  │ Order       │              │
│  │             │  │ ...         │  │ ...         │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

## Services

### SystemPrismaService

Use for accessing global/system tables:

```typescript
import { SystemPrismaService } from './prisma/prisma.module.js';

@Injectable()
export class TenantService {
  constructor(private readonly systemPrisma: SystemPrismaService) {}

  async getTenants() {
    return this.systemPrisma.tenant.findMany();
  }
}
```

### TenantPrismaService

Use for accessing tenant-scoped data (request-scoped, auto-routes to correct schema):

```typescript
import { TenantPrismaService } from './prisma/prisma.module.js';

@Injectable()
export class ProductService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async getProducts() {
    // Automatically queries the correct tenant schema
    return this.tenantPrisma.product.findMany();
  }
}
```

### TenantOnboardingService

Complete tenant provisioning workflow:

```typescript
import { TenantOnboardingService } from './prisma/prisma.module.js';

const result = await onboardingService.onboardTenant({
  name: 'Acme Restaurant',
  slug: 'acme-restaurant',
  businessType: 'RESTAURANT',
  adminName: 'John Doe',
  adminEmail: 'john@acme.com',
  adminPassword: 'SecurePassword123',
  branchName: 'Main Branch',
});

// Result:
// {
//   tenantId: 'cm123...',
//   schemaName: 't_cm123456',
//   status: 'ACTIVE',
//   adminUserId: '...',
//   branchId: '...',
// }
```

## Tenant Onboarding Flow

1. **Receive onboarding request** with tenant details and admin credentials
2. **Create Tenant record** in public schema with `ONBOARDING` status
3. **Generate schema name** (e.g., `t_cm123456`)
4. **Create PostgreSQL schema** using `CREATE SCHEMA`
5. **Apply tenant DDL** (create all tables, indexes, constraints)
6. **Create initial data** (admin user, default branch, USD currency)
7. **Update Tenant status** to `ACTIVE`
8. **Log to SystemAuditLog**

## File Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma       # Legacy (keep for reference)
│   ├── system.prisma       # System/global schema
│   └── tenant.prisma       # Tenant schema (no tenantId)
├── generated/
│   ├── prisma/             # Legacy generated client
│   ├── prisma-system/      # System schema client
│   └── prisma-tenant/      # Tenant schema client
├── scripts/
│   ├── generate-prisma-clients.ps1
│   └── generate-prisma-clients.sh
├── src/
│   ├── prisma/
│   │   ├── prisma.module.ts              # Multi-tenant module
│   │   ├── prisma.service.ts             # Legacy service
│   │   ├── multi-tenant-prisma.service.ts # New services
│   │   ├── tenant-context.middleware.ts   # Schema routing
│   │   ├── tenant-schema.manager.ts       # DDL operations
│   │   └── tenant-onboarding.service.ts   # Provisioning
│   └── system-admin/
│       ├── system-admin.module.ts
│       ├── system-admin.service.ts
│       └── system-admin.controller.ts
```

## API Endpoints

### System Admin (Public Schema)

| Method | Endpoint                         | Description          |
| ------ | -------------------------------- | -------------------- |
| GET    | `/system/tenants`                | List all tenants     |
| POST   | `/system/tenants`                | Create new tenant    |
| GET    | `/system/tenants/:id`            | Get tenant details   |
| PATCH  | `/system/tenants/:id/status`     | Update tenant status |
| POST   | `/system/tenants/:id/suspend`    | Suspend tenant       |
| POST   | `/system/tenants/:id/reactivate` | Reactivate tenant    |
| POST   | `/system/tenants/:id/licenses`   | Create license       |
| GET    | `/system/stats`                  | System statistics    |
| GET    | `/system/audit-logs`             | Audit logs           |
| GET    | `/system/health`                 | Health check         |

### Tenant-Scoped (Tenant Schemas)

All existing endpoints (`/products`, `/orders`, etc.) automatically route to the correct tenant schema based on the JWT.

## Migration Guide

### For Existing Services

1. **Replace `PrismaService` with `TenantPrismaService`** for tenant-scoped data:

```typescript
// Before
constructor(private readonly prisma: PrismaService) {}

// After
constructor(private readonly tenantPrisma: TenantPrismaService) {}
```

2. **Remove `tenantId` from queries** - it's no longer needed:

```typescript
// Before
await this.prisma.product.findMany({
  where: { tenantId: user.tenantId },
});

// After
await this.tenantPrisma.product.findMany();
```

3. **Use `SystemPrismaService`** for system operations:

```typescript
constructor(
  private readonly systemPrisma: SystemPrismaService,
  private readonly tenantPrisma: TenantPrismaService,
) {}
```

### Generating Clients

After modifying either schema file:

```bash
# PowerShell (Windows)
pnpm run db:generate:all

# Or manually
npx prisma generate --schema=prisma/system.prisma
npx prisma generate --schema=prisma/tenant.prisma
```

## Supabase Compatibility

This architecture is fully compatible with Supabase PostgreSQL:

- ✅ Uses standard `CREATE SCHEMA` SQL
- ✅ Uses `SET search_path` for routing
- ✅ No superuser-only operations
- ✅ Works with Supabase connection pooling
- ✅ Compatible with Supabase Auth (use JWT claims for tenantId)

## Security Considerations

1. **Schema Isolation**: Each tenant's data is completely isolated in separate schemas
2. **Validation**: Schema names are validated to prevent SQL injection
3. **Status Checks**: Middleware verifies tenant is ACTIVE before allowing access
4. **Audit Logging**: All system-level operations are logged

## Troubleshooting

### "Tenant not found"

- Ensure the JWT contains a valid `tenantId` claim
- Check if the tenant exists in the `public.Tenant` table
- Verify tenant status is `ACTIVE`

### "Schema does not exist"

- Run tenant onboarding again (it's idempotent)
- Check `public.Tenant.schemaName` matches an existing schema
- Use `TenantSchemaManager.listTenantSchemas()` to see all schemas

### "Permission denied"

- Ensure DATABASE_URL has sufficient privileges
- Check Supabase role permissions
