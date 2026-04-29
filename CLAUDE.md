# Pointverse — CLAUDE.md

## Project Overview

Pointverse is an enterprise POS + ERP monorepo supporting **retail** and **restaurant** business types. The system has three apps and four shared packages:

```
apps/
  api/            NestJS backend (port 5000)
  pos-desktop/    Electron + React POS app (port 5173 in dev)
  system-admin/   Next.js admin dashboard (port 3000)
  admin/          Older/alternative admin app
  mobile/         React Native / Expo mobile app
packages/
  types/          Shared TypeScript enums, interfaces, Zod schemas
  ui/             Shared Shadcn-based React component library
  eslint-config/  Shared ESLint config
  typescript-config/  Shared tsconfig bases
```

**Package manager:** `pnpm` (workspace)  
**Build orchestrator:** Turborepo (`turbo`)  
**Language:** TypeScript throughout  
**VAT rate:** 11% (hardcoded in `orders.service.ts`)

---

## Commands

```bash
# Root — all apps
pnpm dev                        # Run everything in dev mode
pnpm build                      # Build all apps
pnpm lint                       # Lint all apps
pnpm check-types                # TypeScript type check all apps

# Filtered
pnpm dev --filter=api
pnpm dev --filter=pos-desktop
pnpm dev --filter=admin

# Database (run from root or apps/api)
pnpm db:generate                # Regenerate Prisma client
pnpm db:push                    # Push schema to DB (no migration)
pnpm db:seed                    # Seed the database
```

---

## Backend (`apps/api`)

### Architecture
- **NestJS** with a strict module-per-feature structure under `src/modules/`
- Every module has: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`
- `PrismaModule` is the single shared database provider — injected as `PrismaService`
- Prisma client is **generated into** `src/generated/prisma/` — never edit generated files

### Auth & Security
- Global `JwtAuthGuard` protects all endpoints by default (applied at app level)
- Use `@Public()` decorator to opt out of auth
- `@Roles(UserRole.ADMIN, UserRole.MANAGER)` decorator restricts by role
- `@CurrentTenant()` param decorator extracts `tenantId` from the JWT
- Roles: `SYSTEM_ADMIN | ADMIN | MANAGER | CASHIER | KITCHEN`
- POS app auth uses **Bearer token in Authorization header** (stored in `localStorage`)
- System admin auth uses **httpOnly cookie** (`sa_token`)
- Logout blacklists the token via `TokenBlacklistService`

### Validation
- Uses a global `ZodValidationPipe` — DTO types can be Zod schemas
- For manual validation in controllers, use the `validateBody(schema, body)` pattern (see `orders.controller.ts`)
- Throws `BadRequestException` with flattened Zod errors on failure

### Tenancy
- Every model that belongs to a tenant has a `tenantId` field
- Always scope queries with `{ tenantId }` in the `where` clause — never query without it
- Tenant is resolved from `req.user.tenantId` (set by JWT strategy)

### Database Patterns
- Use `this.prisma.$transaction(async (tx) => { ... })` for atomic operations
- Inventory deduction runs **outside** the payment transaction to avoid deadlocks — always post-commit
- Prefer `Promise.all([...])` for parallel independent DB queries
- Use `new Prisma.Decimal(value)` when setting Decimal fields (price, amount, etc.)
- Soft deletes: products, tables, and modifiers use `isDeleted: boolean`

### Module List
`auth, branches, category, color, currencies, customers, devices, floors, inventory, kitchen, loyalty, modifier-groups, offers, orders, prisma, products, purchase-orders, refunds, reports, suppliers, system-admin, tables, tenant, transfers, users`

### CORS Origins (configured in `main.ts`)
- `localhost:3000` (admin), `localhost:5173` (POS web), `localhost:19006` (Expo), `192.168.0.102:8081` (mobile)
- Custom headers: `X-Device-Token`, `X-Device-Id`

### Order State Machine
```
RETAIL:   DRAFT → ON_HOLD | PENDING | COMPLETED | CANCELLED
RESTAURANT: DRAFT → CONFIRMED → SENT_TO_KITCHEN → IN_PROGRESS → READY → COMPLETED
             (also: PAID, PARTIALLY_PAID for restaurant payment flow)
```
Inventory is deducted **only once**, when order reaches COMPLETED (retail) or PAID (restaurant) — handled by `InventoryDeductionService.deductStockForOrder()`.

---

## Frontend POS Desktop (`apps/pos-desktop`)

### Tech Stack
- **Electron** + **React** + **Vite**
- **Routing:** TanStack Router (file-based, `src/routes/`, auto-generated `routeTree.gen.ts`)
- **State:** Zustand stores (persisted via `zustand/middleware persist`)
- **Server state:** TanStack Query (queries + mutations)
- **UI:** `@repo/ui` (Shadcn-based), accessed via `Shad.*` namespace
- **Styling:** Tailwind CSS
- **Forms:** TanStack Form + Zod
- **Notifications:** `sonner` toast
- **PDF reports:** `@react-pdf/renderer`
- **Image storage:** Supabase Storage (`src/lib/supabse.ts` + `uploadImage.ts`)

### Project Structure
```
src/
  apis/       One file per domain (e.g. ordersApi.ts) — axios calls
  components/ Grouped by domain (orders/, products/, common/, etc.)
  dto/        Zod schemas + TypeScript interfaces for API payloads
  hooks/      TanStack Query wrappers (use<Domain>.ts per domain)
  routes/     TanStack Router file-based routes
  store/      Zustand stores (authStore, orderStore, modalStore, etc.)
  types/      Local TypeScript types not in @repo/types
  utils/      Pure utility functions
  pdf/        PDF document components + export utilities
  lib/        External client setup (supabase, uploadImage)
  electron/   Electron main process
```

### API Layer Pattern
1. `src/apis/api.ts` — Axios instance with base URL from `VITE_API_URL` and JWT interceptor
2. `src/apis/<domain>Api.ts` — Plain object with async methods calling `api.get/post/patch/delete`
3. `src/hooks/use<Domain>.ts` — TanStack Query `useQuery` / `useMutation` wrappers
4. Components consume only hooks, never raw API files directly

### Zustand Store Conventions
- Stores live in `src/store/`
- Names follow `use<Name>Store` pattern
- Persisted stores use `zustand/middleware persist` with `partialize` to exclude functions
- `authStore` — user, token, role flags (`isHighLevelUser`, `isStaff`)
- `orderStore` — tab management + active order state (persisted as `pos-order-store`)
- `branchStore` — selected branch (persisted)
- `modalStore` — single global modal (title + content as ReactNode)
- `kitchenStore`, `refundStore`, `keypadStore` — domain-specific ephemeral state

### Order Tab System
The order page supports up to 5 concurrent order tabs (configurable via `maxTabs`). Each tab holds a full local `Order` object. When an order is persisted to the backend, the tab's `order.id` is updated from the local `order-<timestamp>` ID to the server UUID via `updateOrderId()`.

### Modal Pattern
Open modals via `useModalStore`:
```tsx
const { openModal } = useModalStore();
openModal("Title", <MyFormComponent />, "Optional description");
```

### Query Key Conventions
```ts
["orders"]         → all orders
["orders", id]     → single order
["tables"]         → all tables
["products"]       → all products
["stock"]          → inventory/stock
["loyalty"]        → loyalty program + accounts
["adjustmentHistory"] → inventory history
```
Mutations always `invalidateQueries` on the affected query keys.

### Routing
- File-based routes in `src/routes/` — never manually edit `routeTree.gen.ts`
- Route params accessed via `Route.useParams()`
- Search params validated with Zod via `validateSearch`
- Auth redirect: `MainLayout` checks `isAuthenticated` and redirects to `/auth`

### Shared UI (`@repo/ui`)
- All Shadcn components are re-exported under the `Shad` namespace
- Import: `import { Shad } from "@repo/ui"`
- Usage: `<Shad.Button>`, `<Shad.Dialog>`, `<Shad.ScrollArea>`, etc.

---

## Shared Packages (`packages/types`)

### Enums
All enums are defined as `const` objects with matching type aliases. Pattern:
```ts
export const OrderStatus = { DRAFT: "DRAFT", ... } as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
```

Key enums: `BusinessType`, `OrderStatus`, `OrderType`, `UserRole`, `PaymentMethod`, `TableStatus`, `TransferStatus`, `LoyaltyTransactionType`, `InventoryChangeType`

### Import Convention
- Types/enums shared between frontend and backend come from `@repo/types`
- Never re-declare enums locally if they exist in `@repo/types`

---

## Naming Conventions

### Backend (NestJS)
- Files: `kebab-case.ts` (e.g. `orders.service.ts`, `table-status.service.ts`)
- Classes: `PascalCase` (e.g. `OrdersService`, `JwtAuthGuard`)
- Methods: `camelCase` (e.g. `findAll`, `processPayment`)
- DTOs: `PascalCase` suffix `Dto` (e.g. `CreateOrderDto`, `AddItemDto`)
- Decorators: `@Roles(...)`, `@CurrentTenant()`, `@Public()`

### Frontend (React)
- Files: `PascalCase.tsx` for components, `camelCase.ts` for non-component files
- Hooks: `use<Domain>` or `use<Action>` (e.g. `useOrders`, `useCreateOrder`)
- API files: `<domain>Api.ts` (e.g. `ordersApi.ts`)
- Stores: `use<Name>Store`
- Component folders: lowercase kebab-case (`common/`, `orders/`, `nav-drawer/`)
- Route files: match URL segments, index routes use `index.tsx`

---

## Multi-tenancy Rules
- Every backend service method takes `tenantId` as the first parameter
- Every Prisma query that touches tenant-scoped data includes `tenantId` in `where`
- The `@CurrentTenant()` decorator is used sparingly — most controllers manually cast `req.user`

## Business Type Branching
Both backend and frontend branch logic based on `BusinessType.RESTAURANT` vs `BusinessType.RETAIL`. Check `tenant.businessType` when behavior differs between business types.

## Environment Variables

### Backend (`apps/api/.env`)
```
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
PORT=5000
```

### POS Desktop (`apps/pos-desktop/.env`)
```
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=
VITE_SUPABASE_SERVICE_ROLE_KEY=
```

---

## Key Architectural Decisions

1. **Inventory deduction is post-commit** — runs after the main payment/status transaction commits, on a separate connection. If deduction fails, the payment is already recorded; inventory is reconciled separately.

2. **Server is the source of truth for pricing** — the frontend sends product IDs and quantities; the backend fetches prices from the database. The `unitPrice` field in `CreateOrderDto` is an override, not the default.

3. **Batch payments** — the `processPayment` endpoint accepts either an array of payments (`payments: PaymentDto[]`) or a single legacy payment for backward compatibility.

4. **Loyalty is a three-phase process** — (1) atomic payment tx, (2) post-commit ledger debit for redemption, (3) post-commit ledger credit for earning. Each uses idempotency keys.

5. **Table one-order constraint** — each table can have at most one active order. Conflicts throw `ConflictException` with `code: 'TABLE_HAS_ACTIVE_ORDER'` and `activeOrderIds`.

6. **Order merging** is restaurant-only and requires both orders on the same table.

7. **Supabase Storage** is used for product images only — the rest of the data goes through the NestJS API.
