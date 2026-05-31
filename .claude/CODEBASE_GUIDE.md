# Pointverse (Cedar Point POS) — Codebase Guide

A reference for working on this repo. Read this before reaching for `git grep`.

---

## 1. What we are building

**Pointverse** (product name: **Cedar Point POS**) is a multi-tenant, offline-first POS/ERP for **retail and restaurant** businesses.

Each tenant picks a `BusinessType` of `RETAIL` or `RESTAURANT`, and a lot of behavior branches on that — order lifecycle, kitchen flow, table management. Everything else is shared.

Surfaces:
- **POS Desktop** (Electron + React + Vite) — cashier-facing register, KDS, table view, refunds, reports.
- **System Admin** (Next.js) — platform operators: tenants, currencies, system health.
- **Admin** (Next.js) — per-tenant management dashboard (currently a blank scaffold, `apps/admin/blank/`).
- **Mobile** (Expo / React Native) — companion app (auth + early scaffolding).
- **API** (NestJS) — the single source of truth, talks to Postgres via Prisma.

---

## 2. Repo layout

```
Pointverse/
├── apps/
│   ├── api/             NestJS backend (Prisma + Postgres)
│   ├── pos-desktop/     Electron + React + Vite POS app
│   ├── system-admin/    Next.js 16 admin dashboard (platform-level)
│   ├── admin/           Next.js per-tenant admin (scaffold, mostly empty)
│   └── mobile/          Expo / React Native mobile companion
├── packages/
│   ├── types/           @repo/types — shared Zod schemas + enums (built with tsup)
│   ├── ui/              @repo/ui — Shadcn-based component library (source-only export)
│   ├── eslint-config/   @repo/eslint-config — base / next / react-internal / vite presets
│   └── typescript-config/ @repo/typescript-config — base / nextjs / vite / react bases
├── turbo.json           Turborepo pipeline
├── pnpm-workspace.yaml  pnpm workspaces
└── package.json         Root scripts: dev / build / lint / check-types / format
```

Package manager: **pnpm 10.29.1** (set in root `packageManager` and `engines.node >=18`).
Build orchestrator: **Turborepo 2.9.14** (`ui: tui`).
Common scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm check-types`, `pnpm format`.
Filtering: `pnpm dev --filter=api` / `--filter=pos-desktop` / `--filter=admin`.

---

## 3. Tech stack

### Backend ([apps/api](apps/api))
- **NestJS 11** (ESM, `"type": "module"`, imports use `.js` extensions on relative paths because of NodeNext)
- **Prisma 7** with the new `prisma-client` generator outputting to [apps/api/src/generated/prisma](apps/api/src/generated/prisma)
- **PostgreSQL** (provider in [schema.prisma](apps/api/prisma/schema.prisma); `DATABASE_URL` / `DIRECT_URL` env)
- **JWT** via `@nestjs/passport` + `passport-jwt`; access token 24h, refresh 7d
- **Zod** validation pipe + class-validator (both registered globally)
- **Throttler** global guard (100 req/min default; tighter `5/min` on auth)
- **Socket.IO** for the kitchen gateway (namespace `kitchen`, rooms keyed by `branch_{branchId}`)
- **EventEmitter2** for in-process events (e.g. `kitchen.order.updated`, `kitchen.order.created`)
- **Swagger** at `/docs` with `addBearerAuth()`
- **Jest** for unit tests

### POS Desktop ([apps/pos-desktop](apps/pos-desktop))
- **Electron 39** packaged with **Electron Forge 7** + Vite plugin; custom frameless window with IPC `frame-action`
- **React 19** + **Vite 7** (SWC) + **TanStack Router** with `autoCodeSplitting`
- **TanStack Query v5** for server cache (`queryClient` exported from [components/providers](apps/pos-desktop/src/components/providers/index.tsx))
- **Zustand** stores with `persist` middleware (auth, branch, kitchen, order, refund, modal, keypad)
- **Axios** client with auth interceptor in [apis/api.ts](apps/pos-desktop/src/apis/api.ts); 30s timeout; auto-logout on 401
- **Tailwind v4** + **shadcn/ui** via `@repo/ui`
- **socket.io-client** for KDS, **@react-pdf/renderer** for receipts
- **Auto-update** via `update-electron-app` + GitHub publisher
- **Vitest** + **jsdom** for tests

### System Admin ([apps/system-admin](apps/system-admin))
- **Next.js 16** App Router with route groups `(admin)` and `(auth)`
- Cookie-based auth (`sa_token`), enforced by `proxy.ts` middleware
- `fetch` wrapper in [apis/api.ts](apps/system-admin/src/apis/api.ts) with `credentials: "include"`
- TanStack Query with 5m staleTime, no refetch on focus

### Mobile ([apps/mobile](apps/mobile))
- **Expo 54** + **expo-router 6** + React Native 0.81
- **NativeWind / Uniwind** + `@rn-primitives/*` (Radix-style RN primitives)
- Zustand for auth/theme; axios-based `apiRequest` in [lib/api.ts](apps/mobile/lib/api.ts) with smart dev-host resolution (Metro hostUri → Android emulator fallback to 10.0.2.2)

### Shared packages
- **`@repo/types`** — single source of enums + Zod schemas (built with `tsup` to `dist/`). Always import enums/types from here, not from Prisma. The Prisma client is server-only.
- **`@repo/ui`** — exports source `.tsx` directly (no build step). Two layers:
  - `src/components/*` — primitive Shadcn components (button, dialog, table, ...)
  - `src/ui-components/*` — composed app-level helpers (data-table, combobox, *-field form bindings, pagination)
  - Re-exports `toast` from `sonner` and a `cn` util.
- **`@repo/eslint-config`** — `base`, `next`, `react-internal`, `vite` presets; uses `only-warn` so lint never fails CI on style.
- **`@repo/typescript-config`** — strict, NodeNext-ish; `noUncheckedIndexedAccess: true`.

---

## 4. Domain model (high-level)

Read [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) for the full thing. Mental model:

- **Tenant** is the multi-tenancy root. Cascade deletes flow down from it. `businessType: RETAIL | RESTAURANT` gates a lot of behavior.
- **Branch** belongs to a tenant; inventory, orders, shifts, devices, floors, tables, sequences are all branch-scoped.
- **POSDevice** is a per-branch terminal; supports `isKDS` flag.
- **User** has `UserRole`: `SYSTEM_ADMIN | ADMIN | MANAGER | CASHIER | KITCHEN`. `tenantId` is nullable (system admins have none).
- **Product** is tenant-scoped, optionally branch-scoped, soft-deleted via `deletedAt`. Has categories/subcategories with `Color`, modifier assignments, inventory rows per branch.
- **Order** carries everything: `OrderType`, `OrderStatus`, totals/subtotal/discount/VAT/shippingFee, loyalty fields, currency + exchangeRate at the order level. Order numbers are per-branch-per-year via `OrderSequence` (`{YYYY}-{00001}`).
- **OrderItem** has its own `discount` JSON, list of `OrderItemModifier`s, and `OrderItemTicket`s (one per kitchen station send).
- **Payment** stores amount in **base currency** (post-conversion) with the original `currencyCode` + `exchangeRate` preserved. Idempotent via `(orderId, idempotencyKey)`.
- **Refund** + **RefundItem** + **RefundPayment**, with optional loyalty restoration/reversal.
- **Inventory** + **InventoryHistory** ledger; **Transfer** + **TransferItem** for branch-to-branch moves.
- **Shift / ShiftSchedule / ShiftPaymentSummary / ShiftReportSnapshot** for cash drawer + Z-reports; **CashMovement** is the ledger.
- **LoyaltyProgram / LoyaltyAccount / LoyaltyTransaction** with EARN / REDEEM / REFUND_RESTORE_REDEEM / REFUND_REVERSE_EARN / MANUAL_ADJUSTMENT / RECONCILE_RESTORE types.
- **Supplier + PurchaseOrder + PurchaseOrderItem** for inbound stock.
- **Floor + Table** with `TableStatus: AVAILABLE | OCCUPIED | RESERVED` for restaurant floor plans.

### Key enums (canonical list lives in [packages/types/src/enums.ts](packages/types/src/enums.ts))
`BusinessType`, `OrderType`, `OrderStatus`, `PaymentMethod`, `UserRole`, `InventoryChangeType`, `TableStatus`, `ModifierType`, `TransferStatus`, `PurchaseOrderStatus`, `ShiftStatus`, `ShiftCloseMode`, `ShiftCloseResult`, `ShiftScheduleStatus`, `CashMovementType`, `CashMovementReferenceType`, `LoyaltyEnrollmentMode`, `LoyaltyTransactionType`, `LoyaltyDirection`, `SortOrder`.

Note: enums are declared as `const` objects + matching `type` exports — they are **not** TS `enum`s. Use the type and value the same way: `OrderStatus.DRAFT`, `BusinessType.RESTAURANT`.

---

## 5. API conventions

### Module layout
Every domain lives in [apps/api/src/modules/<feature>/](apps/api/src/modules). The common shape is:
```
<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── dto/
└── (gateway, sub-services, etc. when needed)
```
Larger features split into multiple services — e.g. `inventory/` has `inventory.service.ts` + `inventory-deduction.service.ts` + `inventory-transaction.service.ts` + `stock-adjustment.service.ts`.

### Global guards (registered in [app.module.ts](apps/api/src/app.module.ts))
1. `ThrottlerGuard`
2. `JwtAuthGuard` (skips when `@Public()` is set)
3. `RolesGuard` (checks `@Roles(UserRole.X)`)

### Auth
- Three auth flows:
  - **POS / mobile (password)**: `POST /auth/sign-in` returns `{ user, accessToken, refreshToken }`. Client stores `accessToken` in `localStorage` and sends `Authorization: Bearer ...`.
  - **POS terminal (PIN)**: `POST /auth/pin-login` (`@Public()`, throttled) returns `{ user, accessToken, sessionId }`. The terminal supplies a `staffId` + numeric PIN; `tenantId` is derived from the staff record server-side. Short-lived (8h) token, no refresh token. See PIN auth notes below.
  - **System admin**: `POST /auth/admin-sign-in` sets **httpOnly cookies** `sa_token` + `sa_refresh_token`.
- JWT strategy extracts from **either** the bearer header **or** the `sa_token` cookie — see [strategies/jwt.strategy.ts](apps/api/src/modules/auth/strategies/jwt.strategy.ts).
- A `TokenBlacklistService` invalidates tokens on logout until they expire.
- Refresh tokens are bcrypt-hashed at rest on `User.refreshToken`.
- `JwtPayload` is `{ id, username, tenantId?, role, sessionId? }`. `sessionId` is present only for PIN logins so `logout()` can close the `StaffSession`. The whole `User` object is hydrated onto `request.user` by `validate()`.

### Staff management & PIN auth ([modules/staff/](apps/api/src/modules/staff), [modules/auth/](apps/api/src/modules/auth))
- Staff are `User` rows. Tenant-side CRUD + security toggles live in `StaffController`/`StaffService`; PIN actions are staff-management and live there too (`PATCH /staff/:id/set-pin`). `AuthController` is only login/logout/refresh/pin-login.
- **Role hierarchy** is centralized in [common/role-authorization.ts](apps/api/src/modules/common/role-authorization.ts): `assertCanManageRole(actorRole, targetRole)` (ADMIN manages anyone, MANAGER only non-privileged staff, others rejected) and `assertAssignableRole` (never `SYSTEM_ADMIN`). Pure, self-contained, and unit-tested as a table in `role-authorization.spec.ts`.
- **PINs**: 4–6 digits, bcrypt cost 12, never returned raw — services expose a derived `isPinSet`. `CreateStaffSchema.pin` is optional (hash on create, or set later).
- **PIN login is constant-time**: exactly one bcrypt compare runs on every path (real hash or `DUMMY_PIN_HASH`) so timing can't enumerate staff IDs; unknown/no-PIN/wrong-PIN all return `INVALID_PIN`, and status codes are revealed only after a valid PIN. An explicit but unknown `deviceId` throws `DEVICE_NOT_FOUND` (no silent branch fallback). The 8h token has no refresh — terminals re-auth per shift.
- **StaffSession lifecycle**: `pin-login` creates a `StaffSession` and embeds `sessionId` in the JWT; `logout()` closes it idempotently. Admins force-close via `PATCH /staff/sessions/:sessionId/end`.
- **Audit log**: annotate any handler with `@LogActivity(action, module)` to write a `StaffActivityLog` on success. The `ActivityLogInterceptor` is registered globally in [app.module.ts](apps/api/src/app.module.ts) (with the guards) and is a no-op without the decorator. Used in orders, refunds, shifts, inventory, and **all staff-management mutations** (`STAFF_*` actions).
- **Auth hardening conventions** (whole `auth` module): side effects from token claims require `jwtService.verifyAsync()` (not `decode()`); endpoints project `req.user` through `toPublicUser` before returning (never leak the raw Prisma row); Prisma writes pick fields explicitly (no `...dto` spread — the global `ValidationPipe` also runs `whitelist: true`); a passport strategy attaches extracted values (e.g. the raw refresh token) to `req.user` so handlers have one source of truth.

### Decorators / helpers ([modules/common/](apps/api/src/modules/common))
- `@Public()` — skip JWT guard
- `@Roles(UserRole.ADMIN, ...)` — require any matching role
- `@CurrentTenant()` — extract `request.user.tenantId`, throws `UnauthorizedException` if missing
- `ZodValidationPipe` — if the DTO metatype is a Zod schema, runs `.parse()`; otherwise no-op (so class-validator still works for traditional DTOs)

### Controller idioms
- Tenant ID **always** comes from the JWT (`req.user.tenantId`), never from the body or query. The decorator pattern (`@CurrentTenant() tenantId: string`) is preferred, but a lot of older controllers still do `const { tenantId } = req.user as { tenantId: string }`. Both are fine; prefer the decorator in new code.
- Soft delete: most domains use `deletedAt: DateTime?` — never hard-delete. The branch table uses `isDeleted: Boolean` (older pattern, don't replicate).
- Pagination shape: `{ data, pagination: { page, limit, totalCount, totalPages } }`. `QueryParams` type lives in `@repo/types`.

### Transactions & side-effects (read [orders.service.ts](apps/api/src/modules/orders/orders.service.ts))
The order service is the canonical example of how heavy flows are structured. Key patterns:
- **Phase 1 (tx)**: atomic DB writes — order/status, payments, cash movements, table status.
- **Phase 2+ (post-commit)**: side effects that have their own connections/transactions — inventory deduction, loyalty ledger, kitchen events. These run **outside** the tx to avoid deadlocks (e.g. `inventoryDeductionService.deductStockForOrder` opens its own `$transaction`; nesting it deadlocks against the Serializable lock on `Order`).
- **Idempotency**: clients send `idempotencyKey`. Server checks for an existing `Payment` with that key and re-builds the response if found. Multi-payment batches suffix the key (`key__0`, `key__1`, ...). `Refund`, `CashMovement`, `LoyaltyTransaction` follow the same pattern with `@@unique([tenantId, idempotencyKey])`.
- **State machine**: `validateTransition(businessType, current, next)` enforces separate retail vs restaurant order lifecycles. Don't add new statuses or transitions without updating both maps.
- **Order numbers**: generated atomically via `OrderSequence` upsert with `lastValue: { increment: 1 }`. On `P2002` collisions, the service reconciles the sequence from the latest order number.
- **Currency**: all monetary aggregates are stored in tenant **base currency**. Per-payment original `currencyCode` + `exchangeRate` are preserved on `Payment`. Frontend pre-converts before sending.

### Real-time (kitchen)
- `KitchenGateway` (Socket.IO, namespace `kitchen`, [kitchen.gateway.ts](apps/api/src/modules/kitchen/kitchen.gateway.ts)). Clients `emit('joinBranch', branchId)`; server `emits('orderUpdated' | 'newOrder')` to `branch_{branchId}` room.
- Service code emits in-process events (`eventEmitter.emit('kitchen.order.created', ...)`) which the gateway listens to and forwards.

### CORS (in [main.ts](apps/api/src/main.ts))
Allowed origins: `localhost:3000` (admin), `localhost:5173` (POS web/Vite), `localhost:19006` (Expo web), `192.168.0.102:8081` (Mobile LAN). Update this list when adding new dev origins. Cookies require `credentials: true`.

---

## 6. POS desktop conventions

### Project layout ([apps/pos-desktop/src/](apps/pos-desktop/src))
```
apis/        Axios wrappers per domain (ordersApi, productsApi, ...)
components/  React components grouped by feature
config/      App config
constants/   Static data
context/     Theme provider
dto/         Client-side types/Zod for requests/responses
electron/    main.ts, preload.ts, IPC helpers
hooks/       useX hooks — each wraps TanStack Query for a domain
lib/         Supabase client + image upload helpers
pdf/         React-PDF receipt templates
routes/      TanStack Router file-based routes (+ generated routeTree.gen.ts)
store/       Zustand stores (auth, order, branch, kitchen, refund, modal, keypad)
utils/       Shared utilities (financial math, modifier helpers, ...)
```

### Routing
- File-based TanStack Router with `autoCodeSplitting`. Route tree generated at `src/routeTree.gen.ts` — **don't hand-edit; let the plugin regen.**
- Root layout in [routes/__root.tsx](apps/pos-desktop/src/routes/__root.tsx) wraps everything in `Providers` (QueryClient + ThemeProvider + Toaster) and `MainLayout`.
- Routes use Zod `validateSearch` for typed query params (see [routes/index.tsx](apps/pos-desktop/src/routes/index.tsx)).

### Data layer pattern
1. **Axios module** in `apis/<domain>Api.ts` — pure functions, no React.
2. **Hooks module** in `hooks/use<Domain>.ts` — `useQuery` / `useMutation` wrappers with `queryKey` constants and `invalidateQueries` on success. See [hooks/useOrder.ts](apps/pos-desktop/src/hooks/useOrder.ts) for the canonical shape — note how each mutation explicitly invalidates the related caches (`orders`, `tables`, `stock`, `kitchen-orders`, `loyalty`).
3. **Components** call hooks, never `axios` directly.

### State (Zustand + persist)
- `authStore` persists user + flags in `localStorage` under `pos-auth-state`, with the JWT stored separately as `pos-auth` (consumed by the axios interceptor).
- `orderStore` holds the in-progress order(s) as **tabs**: up to 5 for retail, 15 for restaurants. It supports creating tabs by table, reusing empty tabs, evicting stale tabs, and hydrating from server orders (`loadOrder`, `loadExistingOrder`). Most cart math happens here — server is the source of truth for committed state, store is the source of truth for the in-progress draft.
- Stores partialize before persisting (only essential fields) to avoid bloating localStorage.

### Electron
- `main.ts` creates a frameless 1280×800 window with `sandbox: true`, `contextIsolation: true`, devtools only in dev. Custom title bar uses IPC channel `frame-action` for close/min/max.
- Auto-update via `update-electron-app` pointing at the GitHub publisher in [forge.config.ts](apps/pos-desktop/forge.config.ts).
- Makers: Squirrel (Windows), DMG (macOS), ZIP, DEB, RPM. Icons in `public/assets/`.

---

## 7. System-admin conventions

- Next.js 16 App Router with route groups: `(admin)/...` for the authenticated dashboard and `(auth)/login`.
- Auth is **cookie-based** (`sa_token`), set by the backend on `/auth/admin-sign-in`. [src/proxy.ts](apps/system-admin/src/proxy.ts) is the Next.js middleware (matcher `["/", "/((?!_next|favicon.ico).*)"]`) that redirects unauthenticated requests to `/login` and authenticated requests away from `/login`.
- API client is a `fetch` wrapper (not axios) with `credentials: "include"` — see [apis/api.ts](apps/system-admin/src/apis/api.ts). Throws `ApiError` with status.
- `QueryClient` lives in the same file and is wrapped by `QueryProvider`. Defaults: 5m stale, 10m gc, no refetch on focus/reconnect, 1 retry.

---

## 8. Conventions you'll want to follow

### Naming
- Files: kebab-case in API (`order-item.controller.ts`), camelCase in POS desktop (`useOrder.ts`, `orderStore.ts`, `ordersApi.ts`).
- React components: PascalCase files (`OrderPage.tsx`) inside lowercase feature folders (`components/orders/`).
- API endpoints: REST-ish, lowercased hyphenated (`/orders/:id/send-to-kitchen`, `/orders/:id/transfer-table`).
- Enums: `SCREAMING_SNAKE` values, `PascalCase` const objects (matches Prisma).

### TypeScript
- Strict everywhere; `noUncheckedIndexedAccess: true`. Always handle the `T | undefined` from array access.
- API uses ESM with explicit `.js` import extensions (NodeNext). Don't drop them or imports break at runtime.
- Frontend uses bundler module resolution — extensions optional.
- `@repo/types` is the **one** place for enums and DTO schemas shared across services. Don't redefine `OrderStatus` etc. in app code.

### Validation
- Backend prefers Zod schemas registered as DTO metatypes (then `ZodValidationPipe` parses them); class-validator still works for older DTOs.
- Frontend builds DTOs from Zod schemas in `dto/` and infers types via `z.infer`.

### Money
- All money stored as Prisma `Decimal`. In service code, convert to/from `Number` via `Prisma.Decimal` constructors and the `money()` / `round()` helpers in `OrdersService`.
- Order totals always carry **base currency**. Payments record both the original currency + exchange rate AND the base-currency amount.

### Soft delete
- Use `deletedAt: DateTime?` for new models. Filter with `deletedAt: null` on every read.
- `Branch` uses `isDeleted: Boolean` — historical; leave it alone but don't copy the pattern.

### Multi-tenancy
- **Every query that touches tenant-owned data must filter by `tenantId`.** No exceptions, even for "obviously single-tenant" admin flows. The shape is usually `where: { id, tenantId, deletedAt: null }`.
- Cross-tenant access is allowed only for `SYSTEM_ADMIN` and explicitly through the `system-admin` module.

### Error handling
- Throw Nest exceptions (`BadRequestException`, `NotFoundException`, `ConflictException`, `UnauthorizedException`) — don't return `{ error: ... }` blobs.
- For client-actionable failures attach a structured payload: `throw new ConflictException({ message, code: 'TABLE_HAS_ACTIVE_ORDER', ... })`. The POS handles known `code`s in mutation `onError`.

### Real-time invalidation
- After any mutation that affects orders/tables/stock/kitchen, invalidate the corresponding TanStack Query keys: `orders`, `tables`, `stock`, `adjustmentHistory`, `kitchen-orders`, `loyalty`.
- Kitchen UI also subscribes to the Socket.IO `branch_{branchId}` room — backend events should fire via `eventEmitter.emit('kitchen.order.*')` so the gateway picks them up.

---

## 9. Where things live (quick index)

| Looking for… | Path |
| --- | --- |
| Data model | [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) |
| Seed data | [apps/api/prisma/seed.ts](apps/api/prisma/seed.ts) |
| App bootstrap (API) | [apps/api/src/main.ts](apps/api/src/main.ts), [apps/api/src/app.module.ts](apps/api/src/app.module.ts) |
| Auth | [apps/api/src/modules/auth/](apps/api/src/modules/auth/) |
| Order lifecycle (the big one) | [apps/api/src/modules/orders/orders.service.ts](apps/api/src/modules/orders/orders.service.ts) |
| Inventory deduction (post-commit) | [apps/api/src/modules/inventory/inventory-deduction.service.ts](apps/api/src/modules/inventory/inventory-deduction.service.ts) |
| Kitchen gateway | [apps/api/src/modules/kitchen/kitchen.gateway.ts](apps/api/src/modules/kitchen/kitchen.gateway.ts) |
| Common decorators / guards / pipes | [apps/api/src/modules/common/](apps/api/src/modules/common/) |
| Role hierarchy helpers (+ spec) | [apps/api/src/modules/common/role-authorization.ts](apps/api/src/modules/common/role-authorization.ts) |
| Staff management + PIN + audit log | [apps/api/src/modules/staff/](apps/api/src/modules/staff/) |
| Shared enums + schemas | [packages/types/src/enums.ts](packages/types/src/enums.ts), [packages/types/src/schemas.ts](packages/types/src/schemas.ts) |
| Shared UI primitives | [packages/ui/src/components/](packages/ui/src/components/) |
| POS root | [apps/pos-desktop/src/routes/__root.tsx](apps/pos-desktop/src/routes/__root.tsx) |
| POS axios client | [apps/pos-desktop/src/apis/api.ts](apps/pos-desktop/src/apis/api.ts) |
| POS order store | [apps/pos-desktop/src/store/orderStore.ts](apps/pos-desktop/src/store/orderStore.ts) |
| POS order hooks | [apps/pos-desktop/src/hooks/useOrder.ts](apps/pos-desktop/src/hooks/useOrder.ts) |
| Electron main | [apps/pos-desktop/src/electron/main.ts](apps/pos-desktop/src/electron/main.ts) |
| Forge build | [apps/pos-desktop/forge.config.ts](apps/pos-desktop/forge.config.ts) |
| System-admin middleware | [apps/system-admin/src/proxy.ts](apps/system-admin/src/proxy.ts) |
| Mobile API resolver | [apps/mobile/lib/api.ts](apps/mobile/lib/api.ts) |

---

## 10. Gotchas

- **Prisma client path**: imports use `../../generated/prisma/client.js` (note the `.js`) because the API is ESM. Don't import from `@prisma/client` directly in this repo.
- **CORS origins are hardcoded** in [main.ts](apps/api/src/main.ts). Adding a new client origin needs an edit here.
- **Generated files**: `apps/pos-desktop/src/routeTree.gen.ts` and `apps/api/src/generated/prisma/**` are produced by the tooling. They show up dirty in `git status` between dev cycles — that's expected.
- **VAT** is hardcoded at `0.11` (11%) in both `OrdersService` and `orderStore`. Don't change one without the other.
- **`mode: 'insensitive'`** is needed on Postgres `contains` searches; use `Prisma.QueryMode.insensitive` (see [products.service.ts](apps/api/src/modules/orders/orders.service.ts) `getProductsPaginated`).
- **Two payment flows exist** in `OrdersService`: `processPayment` (current — batches + idempotency + loyalty) and `processPayment_LEGACY` (kept for backwards compat). New code should call `processPayment`.
- **Order number recovery**: if `P2002` hits on `(branchId, orderNumber)`, the service reconciles `OrderSequence.lastValue` from the latest existing order — don't reset it manually.
- **Inventory deduction is OUTSIDE the order transaction by design.** Don't move it back in; the comment in `processPayment` explains why (Serializable lock deadlock).
- **Restaurant vs retail completion**: retail orders auto-complete on full payment; restaurant orders go `PAID` and require explicit completion. Stock deduction only fires for retail in `processPayment` — restaurant deducts on `updateStatus → COMPLETED`.
- **`@repo/types` is built (tsup → `dist/`)**: after editing `packages/types/src/**`, run `pnpm --filter @repo/types build` or you get stale `has no exported member` errors in the apps. Pair this with `pnpm --filter api db:generate` after `schema.prisma` changes.
- **Jest can't load the ESM `@repo/types` dist** (the API test config is CJS via ts-jest). The Jest `moduleNameMapper` in [apps/api/package.json](apps/api/package.json) maps `@repo/types` to its TypeScript **source** so ts-jest compiles it. Type-only imports are erased and never hit this; specs using `@repo/types` **values** (e.g. `UserRole`) depend on that mapping.