# Staff Module Implementation Plan — Pointverse POS

## Orientation

The `User` model already IS the staff model — it has `name`, `role`, `isActive`, `tenantId`, `avatar`, bcrypt password, and shift relations. **Do not create a parallel Staff model.** Extend what exists.

Three things are genuinely missing from the schema: PIN login, POS access control, and activity logging. Everything else builds on existing infrastructure.

---

## Phase 1 — Database (Prisma Schema)

**File:** `apps/api/prisma/schema.prisma`

### 1.1 Extend the `User` model

Add these fields:

```prisma
pinHash       String?           // bcrypt-hashed 4-6 digit PIN for POS login
hasPosAccess  Boolean  @default(true)  // separate from isActive
branchId      String?           // default branch assignment
lastLoginAt   DateTime?

branch        Branch?  @relation("UserBranch", fields: [branchId], references: [id])
activityLogs  StaffActivityLog[]
staffSessions StaffSession[]
```

### 1.2 Add `StaffActivityLog` model

```prisma
model StaffActivityLog {
  id        String   @id @default(uuid())
  staffId   String
  tenantId  String
  branchId  String?
  action    String   // "REFUND_CREATED", "DISCOUNT_APPLIED", "ORDER_CANCELLED"
  module    String   // "orders", "inventory", "payments"
  metadata  Json?    // { orderId, amount, reason, ... }
  createdAt DateTime @default(now())

  staff     User     @relation(fields: [staffId], references: [id])
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([staffId, createdAt])
  @@index([tenantId, createdAt])
}
```

### 1.3 Add `StaffSession` model

```prisma
model StaffSession {
  id        String    @id @default(uuid())
  staffId   String
  tenantId  String
  branchId  String
  deviceId  String?
  startedAt DateTime  @default(now())
  endedAt   DateTime?
  isActive  Boolean   @default(true)

  staff     User      @relation(fields: [staffId], references: [id])
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  branch    Branch    @relation(fields: [branchId], references: [id])

  @@index([staffId, isActive])
  @@index([tenantId, branchId, isActive])
}
```

### 1.4 Extend `UserRole` enum

Add missing roles to `packages/types/src/enums.ts`:

```ts
WAITER          // restaurant floor staff
DRIVER          // delivery
INVENTORY_STAFF // warehouse/stock roles
```

### 1.5 Add relations to `Tenant` and `Branch`

```prisma
// In Tenant
activityLogs  StaffActivityLog[]
staffSessions StaffSession[]

// In Branch
staffSessions StaffSession[]
```

---

## Phase 2 — Backend: Extend Auth Module for PIN Login

**Files:** `apps/api/src/modules/auth/`

### 2.1 Add PIN login endpoint

New method in `auth.service.ts`:

```ts
async pinLogin(tenantId: string, staffId: string, pin: string): Promise<{
  user: PublicUser;
  accessToken: string;
  sessionId: string;
}>
```

Logic:
1. Look up user by `id` + `tenantId`
2. Check `isActive` and `hasPosAccess`
3. `bcrypt.compare(pin, user.pinHash)`
4. On success: generate short-lived access token (8h), create a `StaffSession` record, update `lastLoginAt`
5. Return token + sessionId (stored in POS for session-end tracking)

Add `POST /auth/pin-login` to `auth.controller.ts`. Mark `@Public()` — device-level JWT is validated separately.

### 2.2 Add PIN setup/reset endpoint

```ts
async setPin(userId: string, pin: string): Promise<void>
// bcrypt.hash(pin, 12), update user.pinHash
```

`POST /auth/:id/set-pin` — requires `ADMIN` or `MANAGER` role.

---

## Phase 3 — Backend: Staff Module (New NestJS Module)

**Location:** `apps/api/src/modules/staff/`

Create: `staff.module.ts`, `staff.service.ts`, `staff.controller.ts`, `dto/staff.dto.ts`

### 3.1 Service methods

| Method | Description |
|--------|-------------|
| `getStaff(tenantId, filters)` | Paginated list — filter by role, branchId, isActive, hasPosAccess |
| `getStaffById(tenantId, staffId)` | Profile + recent activity + session info |
| `createStaff(tenantId, dto)` | Creates user record — calls prisma directly with hashed password |
| `updateStaff(tenantId, staffId, dto)` | Name, role, branchId, email, avatar |
| `toggleActive(tenantId, staffId)` | Flip `isActive`, also sets `hasPosAccess = false` when deactivating |
| `togglePosAccess(tenantId, staffId)` | Flip `hasPosAccess` only |
| `getActivityLogs(tenantId, staffId, filters)` | Paginated activity log — filter by module, date range |
| `endSession(sessionId)` | Sets `isActive = false`, `endedAt = now()` on `StaffSession` |

### 3.2 Controller routes

```
GET    /staff                       ADMIN, MANAGER
POST   /staff                       ADMIN
GET    /staff/:id                   ADMIN, MANAGER
PATCH  /staff/:id                   ADMIN, MANAGER
PATCH  /staff/:id/toggle-active     ADMIN
PATCH  /staff/:id/toggle-pos        ADMIN, MANAGER
GET    /staff/:id/activity          ADMIN, MANAGER
POST   /staff/:id/end-session       ADMIN, MANAGER
```

All routes guarded by `JwtAuthGuard` + `RolesGuard`.

### 3.3 Activity logging — shared decorator

Create a reusable `@LogActivity(action, module)` decorator that other modules use to automatically write to `StaffActivityLog`. Wire it into:

- `refunds.service.ts` — REFUND_CREATED
- `orders.service.ts` — ORDER_CANCELLED, DISCOUNT_APPLIED
- `inventory.service.ts` — STOCK_ADJUSTED
- `shifts.service.ts` — SHIFT_OPENED, SHIFT_CLOSED

The decorator pulls `staffId`, `tenantId`, `branchId` from the request context.

---

## Phase 4 — Shared Types Package

**File:** `packages/types/src/schemas.ts`

Add Zod schemas:

```ts
export const CreateStaffSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  branchId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  hasPosAccess: z.boolean().default(true),
});

export const PinLoginSchema = z.object({
  staffId: z.string().uuid(),
  pin: z.string().min(4).max(6),
  deviceId: z.string().optional(),
});

export const StaffActivityLogSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  action: z.string(),
  module: z.string(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.coerce.date(),
});

export const StaffSessionSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid(),
  deviceId: z.string().optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  isActive: z.boolean(),
});
```

Export the updated `UserRole` enum including `WAITER`, `DRIVER`, `INVENTORY_STAFF`.

---

## Phase 5 — Frontend: System Admin (Staff Management UI)

**App:** `apps/system-admin/`

### 5.1 Staff list page

Route: `/staff` — mirrors the existing customers list pattern.

- Table columns: Avatar, Name, Role badge, Branch, Status chip, POS Access toggle, Last Activity, Actions menu
- Filters: Branch selector, Role multiselect, Active/Inactive toggle, POS access filter
- "Add Staff" button → drawer with `CreateStaffSchema` form

### 5.2 Staff profile page

Route: `/staff/[id]` — three sections:

- **Identity**: name, role, branch, email, avatar upload
- **Security**: PIN status ("Configured" / "Not set"), last login timestamp, active session indicator, "Reset PIN" button
- **Activity**: paginated `StaffActivityLog` table — action, module, timestamp, metadata preview

### 5.3 API layer

`apps/system-admin/src/apis/staffApi.ts` — follows the `customersApi.ts` pattern (Axios instance, one export per operation):

```ts
export const getStaff = (params) => api.get('/staff', { params });
export const getStaffById = (id) => api.get(`/staff/${id}`);
export const createStaff = (data) => api.post('/staff', data);
export const updateStaff = (id, data) => api.patch(`/staff/${id}`, data);
export const toggleStaffActive = (id) => api.patch(`/staff/${id}/toggle-active`);
export const togglePosAccess = (id) => api.patch(`/staff/${id}/toggle-pos`);
export const getStaffActivity = (id, params) => api.get(`/staff/${id}/activity`, { params });
export const setStaffPin = (id, pin) => api.post(`/auth/${id}/set-pin`, { pin });
```

### 5.4 React Query hooks

`apps/system-admin/src/hooks/useStaff.ts`:

```ts
useStaffList(filters)         // useQuery — paginated list
useStaffById(id)              // useQuery — profile
useCreateStaff()              // useMutation, invalidates list
useUpdateStaff(id)            // useMutation
useToggleStaffActive(id)      // useMutation
useTogglePosAccess(id)        // useMutation
useStaffActivity(id, filters) // useQuery — paginated logs
useSetStaffPin(id)            // useMutation
```

---

## Phase 6 — Frontend: POS Desktop (PIN Login + Session Switching)

**App:** `apps/pos-desktop/`

### 6.1 Staff store

`apps/pos-desktop/src/store/staffStore.ts` — Zustand with `persist`:

```ts
type State = {
  activeStaff: PublicUser | null;
  sessionId: string | null;
  staffToken: string | null;  // short-lived 8h token from PIN login
  staffList: PublicUser[];    // cached for avatar selector — synced at device login
};

type Actions = {
  setActiveStaff(user: PublicUser, token: string, sessionId: string): void;
  clearActiveStaff(): void;
  setStaffList(staff: PublicUser[]): void;
};
```

Persists `staffList` and `staffToken` to `localStorage`. On app start, rehydrate and validate token expiry — clear if expired.

### 6.2 PIN login screen

New route: `apps/pos-desktop/src/routes/staff-login/index.tsx`

Flow:
1. Grid of staff avatars loaded from `staffStore.staffList`
2. Tap avatar → PIN pad appears
3. Submit → `POST /auth/pin-login`
4. On success → `staffStore.setActiveStaff(...)` → navigate to POS home
5. Wrong PIN → shake animation, increment attempt counter. After 5 attempts: 30-second client-side lockout.

### 6.3 Session switching

"Switch Staff" button in POS header/sidebar:

1. Call `POST /staff/:sessionId/end-session`
2. Call `staffStore.clearActiveStaff()`
3. Navigate back to staff avatar selector — no full app restart needed

### 6.4 Staff API

`apps/pos-desktop/src/apis/staffApi.ts`:

```ts
export const getStaffForBranch = (branchId: string) =>
  api.get('/staff', { params: { branchId, hasPosAccess: true, isActive: true } });

export const pinLogin = (data: PinLoginPayload) =>
  api.post('/auth/pin-login', data);

export const endSession = (sessionId: string) =>
  api.post(`/staff/${sessionId}/end-session`);
```

### 6.5 Offline cache

On device login (manager authenticates the terminal), fetch and cache the staff list to `better-sqlite3`. PIN hashes must be included in this payload so PIN login works offline.

Add an `offline_staff` table to the local SQLite schema:

```sql
CREATE TABLE IF NOT EXISTS offline_staff (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  pin_hash     TEXT,
  has_pos_access INTEGER NOT NULL DEFAULT 1,
  avatar       TEXT,
  branch_id    TEXT,
  synced_at    INTEGER NOT NULL
);
```

Activity logs generated offline queue via the existing `offlineQueueStore` and sync automatically when connectivity returns.

---

## Phase 7 — Wire Activity Logging Into Existing Modules

Once the `@LogActivity` decorator is built in Phase 3.3, add it to these operations:

| Module file | Action constant | Trigger |
|-------------|-----------------|---------|
| `refunds.service.ts` | `REFUND_CREATED` | `createRefund()` |
| `orders.service.ts` | `ORDER_CANCELLED` | `cancelOrder()` |
| `orders.service.ts` | `DISCOUNT_APPLIED` | when `discount > 0` on order |
| `inventory.service.ts` | `STOCK_ADJUSTED` | `adjustStock()` |
| `shifts.service.ts` | `SHIFT_OPENED` | `openShift()` |
| `shifts.service.ts` | `SHIFT_CLOSED` | `closeShift()` |
| `payments.service.ts` | `DRAWER_OPENED` | cash drawer trigger |

---

## Implementation Order

| # | Step | Reason |
|---|------|--------|
| 1 | Prisma schema changes + migration | Everything else depends on it |
| 2 | Shared types package (`enums.ts`, `schemas.ts`) | Backend and frontend both need it |
| 3 | Auth module: PIN login + set-pin endpoints | Unblocks POS desktop work |
| 4 | Staff NestJS module (CRUD + activity log query) | Unblocks admin UI |
| 5 | System admin staff list + profile pages | Lets admins manage staff before POS uses them |
| 6 | POS desktop `staffStore` + PIN login screen | Depends on auth endpoints |
| 7 | POS desktop session switching | Depends on `staffStore` shape being stable |
| 8 | Offline SQLite cache for staff | Depends on `staffStore` shape being stable |
| 9 | `@LogActivity` decorator + wire into existing modules | Last — non-breaking addition to existing services |

---

## Explicitly Out of Scope

Matching the original scope decision — these will not be built:

- Payroll or salary fields
- Manager override PIN flow (session model supports it if added later)
- Custom per-staff permission overrides (role-based only)
- Staff document uploads
- Vacation or contract management
- Modifications to the existing `ShiftSchedule` model
