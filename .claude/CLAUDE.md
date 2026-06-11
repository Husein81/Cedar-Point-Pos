# Pointverse — Working Rules (Claude Code Instructions)

These rules are **mandatory**. They are not suggestions. Every change in this repo must conform to them without exception.

---

## 0. Read first

Before writing any code, read `.claude/CODEBASE_GUIDE.md`. It contains the full mental model of this codebase. If something is described there, match it exactly. If something is not described there, follow the nearest existing pattern in the code.

---

## 1. Tech stack — no additions, no substitutions

### Backend (`apps/api`)
- **NestJS 11** only. No Express handlers, no Fastify.
- **Prisma 7** is the only ORM/query builder. No raw SQL except through `prisma.$queryRaw` when Prisma's query API cannot express it.
- **Zod** for validation. `ZodValidationPipe` is already wired globally.
- **`@nestjs/jwt` + `passport-jwt`** for auth. No other auth libraries.
- **Socket.IO** for real-time. No WebSocket alternatives.
- **EventEmitter2** for in-process events. No RxJS Subjects, no custom buses.
- Never add a new npm dependency to `apps/api` without explicit user approval.

### POS Desktop (`apps/pos-desktop`)
- **TanStack Router** for routing. Never use `react-router` or `wouter`.
- **TanStack Query v5** for server state. Never manage server data in Zustand.
- **Zustand** for client/UI state. No Redux, no Jotai, no Context for global state.
- **Axios** (the existing instance in `apis/api.ts`) for HTTP. Never create a new axios instance; never use `fetch` here.
- **`@repo/ui`** for all UI primitives. Never install a second component library.
- **Tailwind v4** for styling. No inline `style={{}}` objects unless a dynamic value genuinely cannot be expressed in Tailwind.
- Never add a new npm dependency to `apps/pos-desktop` without explicit user approval.

### System Admin (`apps/system-admin`)
- **Next.js 16 App Router** only. No Pages Router patterns.
- The `fetch` wrapper in `apis/api.ts` is the only HTTP client. No axios here.
- **TanStack Query** (same pattern as POS desktop) for server state.
- Never add a new npm dependency to `apps/system-admin` without explicit user approval.

### Shared packages
- **`@repo/types`** — the only place for enums and schemas shared between apps. Never copy-paste an enum into app code.
- **`@repo/ui`** — the only place for shared UI components.
- Never create a new package without explicit user approval.

---

## 2. File and folder structure — follow what exists

### API module shape (always)
```
apps/api/src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts          ← one service per domain concern
└── dto/                          ← Zod DTOs live here
```
- Split into multiple services only when a second distinct concern arises (e.g., `inventory-deduction.service.ts` is separate from `inventory.service.ts`).
- Never put business logic in a controller. Controllers receive, delegate, and return. Nothing else.
- Never put HTTP concerns (decorators, `@Body()`, `@Req()`) in a service.

### POS desktop data layer (always, no exceptions)
```
apis/<domain>Api.ts       ← pure async functions, no React, no hooks
hooks/use<Domain>.ts      ← TanStack Query wrappers only
components/<feature>/     ← components call hooks, never call api functions directly
```
- A component must never import from `apis/`. It imports from `hooks/`.
- An api file must never import from a store or a hook.
- A hook must never contain JSX.

### POS desktop store shape
```
store/<domain>Store.ts    ← Zustand slice per domain concern
```
- One store per domain. Never merge unrelated concerns into one store.
- Stores hold **client/UI state** (tabs, draft order, auth session, modal visibility). Server state lives in TanStack Query — not in a store.

---

## 3. Shared code — use it, do not duplicate it

### Enums
- All enums live in `packages/types/src/enums.ts` and are exported as `const` objects + matching types.
- Never declare a local `enum` or `const` that duplicates a value already in `@repo/types`.
- Import: `import { OrderStatus, UserRole } from '@repo/types'`.
- Usage: `OrderStatus.DRAFT`, `UserRole.ADMIN`. They are const objects, not TypeScript enums.

### Zod schemas
- All shared DTO schemas live in `packages/types/src/schemas.ts`.
- App-specific request/response shapes that are **not** shared across apps live in the app's own `dto/` folder.
- Never write a `z.object({ ... })` that reconstructs a schema already in `@repo/types`. Extend or pick from the canonical one.
- `@repo/types` is a **built** package (tsup → `dist/`). After editing `packages/types/src/**`, rebuild it (`pnpm --filter @repo/types build`) before any API or frontend code can import the new export — otherwise you get `has no exported member` errors against the stale `dist/`.

### UI components
- Before building a new component, check `packages/ui/src/components/` and `packages/ui/src/ui-components/`.
- Compose from existing primitives. Only create a new primitive when no existing one covers the need.
- Import: `import { Button, DataTable, Combobox } from '@repo/ui'`.

### Utilities
- Check `apps/pos-desktop/src/utils/` before writing a new helper. Financial math helpers, modifier helpers, and more are already there.
- Check `apps/api/src/modules/common/` for shared decorators, guards, pipes, and interceptors before writing new ones.

---

## 4. Validation — Zod, always, in the right layer

### API (backend)
- Every controller endpoint that accepts a body, query, or param must have a Zod schema as its DTO.
- Register the Zod schema as the class metatype so `ZodValidationPipe` (already globally registered) handles parsing.
- Never write `if (!body.name) throw new BadRequestException(...)` for input validation — put the constraint in the Zod schema.
- Use `@CurrentTenant()` decorator to extract `tenantId` from JWT. Never accept `tenantId` from the request body.

### Frontend (POS desktop / system-admin)
- Form DTOs are defined with `z.object(...)` in `dto/` and types inferred with `z.infer<typeof Schema>`.
- Validate at the form boundary (TanStack Form + Zod). Never manually validate inside a component render.

---

## 5. Naming conventions — match exactly what exists

| Layer | Convention | Example |
|---|---|---|
| API files | kebab-case | `order-item.controller.ts` |
| API classes | PascalCase | `OrderItemController` |
| API methods | camelCase | `updateItemQuantity` |
| API endpoints | REST hyphenated lowercase | `POST /orders/:id/send-to-kitchen` |
| POS hooks | camelCase file, `use` prefix | `useOrder.ts`, `useProducts.ts` |
| POS api files | camelCase, `Api` suffix | `ordersApi.ts`, `productsApi.ts` |
| POS stores | camelCase, `Store` suffix | `orderStore.ts`, `authStore.ts` |
| React components | PascalCase file, lowercase folder | `components/orders/OrderCard.tsx` |
| Enum values | SCREAMING_SNAKE_CASE | `OrderStatus.DRAFT`, `PaymentMethod.CASH` |
| Enum objects | PascalCase | `OrderStatus`, `PaymentMethod` |
| Prisma models | PascalCase | `Order`, `OrderItem`, `Product` |
| Query keys | kebab-case strings | `'orders'`, `'kitchen-orders'`, `'stock'` |

---

## 6. Multi-tenancy — non-negotiable

- **Every Prisma query that touches tenant-owned data must include `tenantId` in the `where` clause.** No exceptions.
- Standard shape: `where: { id, tenantId, deletedAt: null }`.
- `tenantId` is always sourced from the JWT (`@CurrentTenant()` decorator or `req.user.tenantId`). Never from the request body. Never hardcoded.
- Cross-tenant access is only allowed for `UserRole.SYSTEM_ADMIN` and only inside `apps/api/src/modules/system-admin/`.

---

## 7. Soft delete

- New models use `deletedAt: DateTime?`. Filter with `deletedAt: null` on every read.
- Never use `isDeleted: Boolean` — that is a legacy pattern on `Branch` only. Do not replicate it.
- Never hard-delete a record that has a `deletedAt` field. Set `deletedAt: new Date()`.

---

## 8. Error handling

### API
- Throw NestJS exceptions: `NotFoundException`, `BadRequestException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`.
- Never return `{ error: '...' }` or `{ success: false }` blobs — throw, let the global filter handle the HTTP shape.
- For client-actionable errors, include a `code` in the exception payload:
  ```ts
  throw new ConflictException({ message: 'Table has an active order', code: 'TABLE_HAS_ACTIVE_ORDER' });
  ```
- POS desktop handles known `code` values in `onError` callbacks of TanStack Query mutations.

### Frontend
- Never swallow errors silently. Every `useMutation` must have an `onError` handler that either surfaces a toast or triggers a known recovery flow.
- Never `console.error` as the only error handler.

---

## 9. Order / payment / inventory — critical invariants

- **State machine**: order status transitions are enforced by `validateTransition(businessType, current, next)`. Never bypass it. Never add a transition without updating both the RETAIL and RESTAURANT maps.
- **Idempotency**: every `Payment`, `Refund`, `CashMovement`, and `LoyaltyTransaction` write must include an `idempotencyKey`. The server checks for an existing record before inserting.
- **Post-commit side effects**: inventory deduction, loyalty ledger, and kitchen events run **outside** the main DB transaction. Never move them inside. The comment in `orders.service.ts` explains the deadlock risk.
- **Currency**: store all monetary values in the tenant's base currency. On `Payment`, also store the original `currencyCode` and `exchangeRate`. Never store a non-base-currency amount without the exchange rate alongside it.
- **VAT**: hardcoded at `0.11` (11%) in both `OrdersService` (API) and `orderStore` (POS). If VAT changes, both must be updated together.
- **Order numbers**: generated via `OrderSequence` upsert with `lastValue: { increment: 1 }`. On `P2002`, reconcile from the latest existing order. Never reset the sequence manually.

---

## 10. Real-time

- After any mutation affecting orders, tables, stock, or kitchen: invalidate all related TanStack Query keys.
  - Canonical set: `['orders']`, `['tables']`, `['stock']`, `['kitchen-orders']`, `['loyalty']`, `['adjustmentHistory']`.
  - Reference `hooks/useOrder.ts` for the complete list per operation.
- Backend emits kitchen events via `eventEmitter.emit('kitchen.order.created' | 'kitchen.order.updated', payload)`. The `KitchenGateway` listens and forwards to the Socket.IO room `branch_{branchId}`.
- Never push directly to a Socket.IO room from a service — emit the in-process event and let the gateway handle it.

---

## 11. SOLID enforcement

### Single Responsibility
- One class / module / file = one reason to change.
- A service must not orchestrate both HTTP logic and business logic. Controllers orchestrate HTTP; services contain business logic.
- A Zustand store slice must not manage two unrelated domains. `orderStore` manages order drafts; `authStore` manages session. They do not bleed into each other.
- A TanStack Query hook must not mix two separate domain queries into one hook file unless they are genuinely coupled (e.g., `useOrder` covers order CRUD, not product search).

### Open/Closed
- Extend behavior through new service methods or new DTOs, not by modifying the core `processPayment` / `updateStatus` flows without understanding the full state machine.

### Dependency Inversion
- Inject services via NestJS DI (`constructor(private readonly service: XService)`). Never instantiate a service with `new` inside another service.

---

## 12. DRY enforcement

- Before writing any utility function, check `apps/pos-desktop/src/utils/`, `apps/api/src/modules/common/`, and `packages/types/src/`.
- Before writing any UI component, check `packages/ui/src/components/` and `packages/ui/src/ui-components/`.
- Before writing any Zod schema, check `packages/types/src/schemas.ts`.
- Before writing any enum value, check `packages/types/src/enums.ts`.
- If a function, schema, or component already exists and covers 80% of the need — extend it, don't duplicate it.

---

## 13. KISS enforcement

- Write the simplest thing that works. Do not add abstraction layers that are not called for by a concrete, present need.
- Do not create factory functions, builder patterns, or configuration objects for things that are currently called from one place.
- Do not add optional parameters that are not currently needed.
- Do not create `BaseService`, `BaseController`, or `AbstractRepository` classes unless three or more concrete cases already share the exact same behavior.
- Three similar lines of code is not duplication that needs extracting. Extract only when the shared logic has a stable identity and would otherwise change in multiple places.

---

## 14. Clean code hard rules

- No `any` type. If the shape is unknown, use `unknown` and narrow it.
- No `// TODO`, `// FIXME`, `// HACK` left in committed code. Either fix it or document it in the PR.
- No commented-out code blocks committed. Delete dead code.
- No magic numbers or strings inline. Extract to a named constant in `constants/` or at the top of the file.
- Function names are verbs. Variable names are nouns. Boolean variables are `is*`, `has*`, `can*`.
- No function longer than ~50 lines without a compelling reason. If a function exceeds that, split it into named helper functions within the same service/file.
- No parameter lists longer than 4 positional parameters. Use an options object instead.

---

## 15. TypeScript rules

- `strict: true` is on. Do not use `!` (non-null assertion) unless you have verified the value cannot be null/undefined at that point in the code — add a comment explaining why if you do.
- `noUncheckedIndexedAccess: true` is on. Always handle the `T | undefined` from array indexing.
- API uses ESM with `.js` extensions on relative imports (NodeNext module resolution). Never drop the `.js` extension on a relative import inside `apps/api/`.
- Frontend uses bundler resolution — extensions are optional and typically omitted.
- Never use `enum` keyword. Use `const` objects + type exports as seen in `packages/types/src/enums.ts`.
- Never import Prisma types into frontend code. Prisma is server-only. Use `@repo/types` for shared shapes.

---

## 16. Prisma rules

- The generated client is at `apps/api/src/generated/prisma/`. Import from there, not from `@prisma/client`.
- All generated files (`routeTree.gen.ts`, `generated/prisma/**`) are auto-generated — never hand-edit them.
- After modifying `schema.prisma`, run `pnpm db:generate` (via Turbo filter) before any code that uses the new fields.
- Use `Prisma.Decimal` for all monetary fields. Never cast to `float` or `number` for storage.
- For search: use `mode: Prisma.QueryMode.insensitive` on `contains` predicates. Never use `toLowerCase()` as a workaround.
- Every `findMany` that could return a large set must include pagination (`skip`, `take`) or an explicit `orderBy`.

---

## 17. Staff management, PIN auth & sessions

Staff are `User` rows. Tenant-side management lives in `modules/staff/`; POS terminal authentication lives in `modules/auth/`. Keep the split clean.

### Controller placement
- Staff-profile and PIN actions belong on `StaffController`: `PATCH /staff/:id` (identity), `:id/toggle-active`, `:id/toggle-pos`, `:id/set-pin`. `AuthController` is **only** login / logout / refresh / pin-login. Never put a per-staff management action on `AuthController`.
- Route segments must name the resource they act on, and the verb must match semantics. A session close is `PATCH /staff/sessions/:sessionId/end` — `PATCH` because it's an idempotent state change on an existing resource (`POST` implies non-idempotent creation), and `/sessions/:sessionId` because it acts on a session, not on `/staff/:id`.

### Role hierarchy (`common/role-authorization.ts`)
- Every per-staff mutation takes the actor's role via `@CurrentRole()` and calls `assertCanManageRole(actorRole, targetRole)`: ADMIN may manage anyone; MANAGER may manage only non-privileged staff; any other actor is rejected. `assertAssignableRole` blocks ever assigning `SYSTEM_ADMIN`.
- These helpers are **self-contained (defense in depth)** — never assume the route guard already filtered the caller. They are pure (no Prisma) and unit-tested as a decision table in `role-authorization.spec.ts`. When you change the hierarchy, update that table.

### PINs
- A POS PIN is 4–6 digits, hashed with bcrypt (cost 12) at rest, never stored or returned raw. Expose only a derived `isPinSet` boolean (see `StaffService.toStaffView`).
- `CreateStaffSchema.pin` is optional: hash it on create so the account is POS-ready immediately, or set it later via `set-pin`. Hash PINs in `StaffService`, never in a controller.

### PIN login & session lifecycle
- `POST /auth/pin-login` is `@Public()` + throttled. Derive `tenantId` from the staff record, **never** from the client.
- **Constant-time:** run exactly ONE bcrypt comparison on every path — against the real hash, or `DUMMY_PIN_HASH` when the staff/PIN is absent — so response timing cannot enumerate staff IDs. Collapse unknown-staff / no-PIN / wrong-PIN into a single `INVALID_PIN`. Disclose status codes (`STAFF_INACTIVE`, `POS_ACCESS_DENIED`) only **after** the PIN is proven correct.
- When a `deviceId` is supplied it **must** resolve to a device in the tenant — throw `DEVICE_NOT_FOUND` rather than silently falling back to the staff's default branch, which would bind the session to the wrong branch. The default-branch fallback applies only when no `deviceId` was given.
- A PIN login creates a `StaffSession` and embeds its `sessionId` in the JWT payload. `logout()` reads `sessionId` back and idempotently closes the session (`updateMany`, never throws). **Rule: any session-bound token must carry its session id so logout can close it — never leave orphaned `isActive` sessions.** Admins force-close via `PATCH /staff/sessions/:sessionId/end`. POS PIN tokens are 8h with no refresh — the terminal re-authenticates per shift (a deliberate choice; if you change it, decide consciously and document it).

### Auth hardening (applies to all auth code)
- **Verify before acting:** `jwtService.decode()` does **not** check the signature. Any code that performs a side effect from token claims (clearing a refresh token, closing a session) must `verifyAsync()` first (wrap in try/catch; `ignoreExpiration: true` is fine for logout). `decode()` is acceptable only for non-authoritative reads.
- **Never return `req.user` raw** from an endpoint — it's the full Prisma row (password, pinHash, refreshToken). Project through `AuthService.toPublicUser` (see `GET /auth/me`).
- **Never spread a DTO into Prisma** (`data: { ...dto }`) — explicitly pick allowed fields so a client can't mass-assign columns (`role`, `isActive`, `pinHash`, ...). The global `ValidationPipe` runs with `whitelist: true`, but explicit picks are the real guard.
- When a passport strategy extracts a value (e.g. the raw refresh token), attach it to `req.user` in `validate()` so the controller has a single source of truth — don't re-extract it in the handler from a possibly-different location.

### Secret stripping
- Build public user/DTO shapes by **explicitly picking** safe fields. Never spread-then-overwrite a secret (`{ ...rest, refreshToken: null }`) — a renamed or newly added secret column would silently leak. See `AuthService.toPublicUser`.

### Audit logging
- Annotate a handler with `@LogActivity(action, module)` to record a `StaffActivityLog` on a successful response. The `ActivityLogInterceptor` is registered **once, globally, in `AppModule`** (alongside the `APP_GUARD`s) and is a no-op for handlers without the decorator. It resolves staff/tenant/branch from the request context, never from the handler.
- High-privilege mutations must be audited. Every staff-management mutation (`createStaff`, `updateStaff`, `toggleActive`, `togglePosAccess`, `setPin`, `endSession`) carries a `@LogActivity(StaffActivityAction.STAFF_*, StaffActivityModule.STAFF)`. Add a matching action when you add such an endpoint.
- `APP_INTERCEPTOR` / `APP_GUARD` bind globally regardless of which module declares them — declaring one in a feature module just risks duplicate execution. Register global guards/interceptors only in `AppModule`.
- `@Roles(...)` always takes `UserRole` enum constants, never raw strings — a typo in a string silently breaks authorization with no type error.

### Testing pure logic
- Pure business-logic helpers (no Prisma, no DI) get a co-located `*.spec.ts` exercised as a decision table — `role-authorization.spec.ts` is the reference. Specs that use `@repo/types` runtime values rely on the Jest `moduleNameMapper` that points `@repo/types` at its TypeScript source (`apps/api/package.json`).

---

## 18. What you must never do

- Never introduce a new state management library.
- Never introduce a new HTTP client library.
- Never introduce a new form library.
- Never introduce a new styling approach (CSS modules, styled-components, emotion, etc.).
- Never bypass the JWT guard with a `@Public()` on an endpoint that should be protected.
- Never accept `tenantId` from the request body.
- Never hard-delete a record with a `deletedAt` column.
- Never call an api function directly from a React component — always go through a hook.
- Never put server state into Zustand — server state belongs in TanStack Query.
- Never put UI/client state into TanStack Query — UI state belongs in Zustand.
- Never move inventory deduction or loyalty writes inside the main order transaction.
- Never create a Zod schema or enum that already exists in `@repo/types`.
- Never define a React component in the same file as a Zustand store.
- Never use `console.log` in committed production code paths.
- Never put a per-staff management action (set-pin, toggle-active, role change) on `AuthController` — it belongs on `StaffController`.
- Never register an `APP_GUARD` or `APP_INTERCEPTOR` in a feature module — they bind globally regardless of location; register once in `AppModule`.
- Never branch a PIN-login response before running a (real or dummy) bcrypt comparison, and never reveal account status before the PIN is validated — it enables staff-ID enumeration.
- Never issue a session-bound token without embedding its session id, and never leave a `StaffSession` active after logout.
- Never build a public DTO by spreading the full record and overwriting a secret — explicitly pick the safe fields.
- Never spread a request DTO straight into a Prisma `create`/`update` — pick allowed fields explicitly (mass-assignment guard).
- Never perform a DB side effect from `jwtService.decode()` output — verify the signature with `verifyAsync()` first.
- Never return `req.user` directly from an endpoint — it's the raw Prisma row; project it through `toPublicUser`.
- Never write `@Roles('ADMIN', ...)` with raw strings — use `UserRole` enum constants.
- Never silently fall back when an explicitly supplied identifier (e.g. `deviceId`) fails to resolve — surface a coded error.
