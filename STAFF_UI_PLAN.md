# Staff UI — Strict Implementation Plan (POS Desktop)

Scope: build the tenant-facing **Staff Management** surface in `apps/pos-desktop`, consuming the existing `modules/staff` backend. This plan is binding — every step matches the conventions in [.claude/CLAUDE.md](.claude/CLAUDE.md) and [.claude/CODEBASE_GUIDE.md](.claude/CODEBASE_GUIDE.md). Do not deviate; if a rule below conflicts with a habit, the rule wins.

---

## Backend contract (already implemented — do not modify)

All endpoints are tenant-scoped from the JWT, role-guarded, and audited. Source of truth: [staff.controller.ts](apps/api/src/modules/staff/staff.controller.ts).

| Method & path | Roles | Body schema (`@repo/types`) | Returns |
|---|---|---|---|
| `GET /staff` | ADMIN, MANAGER | `StaffQuerySchema` (query) | `{ data: StaffView[], pagination }` |
| `POST /staff` | ADMIN | `CreateStaffSchema` | `StaffView` |
| `GET /staff/:id` | ADMIN, MANAGER | — | `StaffView & { recentActivity[], activeSession }` |
| `PATCH /staff/:id` | ADMIN, MANAGER | `UpdateStaffSchema` | `StaffView` |
| `PATCH /staff/:id/toggle-active` | ADMIN | — | `StaffView` |
| `PATCH /staff/:id/toggle-pos` | ADMIN, MANAGER | — | `StaffView` |
| `PATCH /staff/:id/set-pin` | ADMIN, MANAGER | `SetPinSchema` | `{ message }` |
| `PATCH /staff/:id/reset-password` | ADMIN, MANAGER | `ResetPasswordSchema` | `{ message }` |
| `GET /staff/:id/activity` | ADMIN, MANAGER | `StaffActivityQuerySchema` (query) | `{ data: StaffActivityLog[], pagination }` |
| `PATCH /staff/sessions/:sessionId/end` | ADMIN, MANAGER | — | session row |

`StaffView` = the `STAFF_SELECT` projection minus `pinHash`, plus `isPinSet: boolean`. Never expect `password`, `pinHash`, or `refreshToken` from any response.

**Role hierarchy reminder (mirror it in the UI, but the server is the real guard):** ADMIN manages anyone; MANAGER manages only non-privileged staff (not ADMIN/MANAGER); `SYSTEM_ADMIN` is never assignable and never listed.

---

## Cross-cutting rules (apply to every phase)

- **Data-layer split is mandatory** ([CLAUDE.md §2](.claude/CLAUDE.md)): `apis/staffApi.ts` (pure axios, no React) → `hooks/useStaff.ts` (TanStack Query only, no JSX) → `components/staff/*` (call hooks, never `apis/` directly).
- **HTTP**: reuse the shared instance — `import { api } from "./api"`. Never `fetch`, never a new axios instance.
- **Types**: import enums/shared schemas from `@repo/types` (`UserRole`, `StaffActivityModule`, `StaffActivityAction`, `CreateStaffInput`, `UpdateStaffInput`, `StaffQuery`, `PaginationResponse`, `QueryParams`). App-only response shapes (the `StaffView`, detail payload) go in `dto/staff.dto.ts` as `z.infer`. Never redefine an enum locally; never import Prisma types.
- **Forms**: TanStack Form (`useForm`) + `@repo/ui` field bindings (`InputField`, `SelectField`, `SwitchField`). Validate at the field/form boundary, never inside render. Mirror `CustomerForm.tsx`.
- **UI primitives**: only `@repo/ui` (`Button`, `DataTable`, `Badge`, `Avatar`, `Shad.*`, `Skeleton`, `SelectField`, `SwitchField`, `Combobox`, `toast`). No second component library. No inline `style={{}}`. Tailwind v4 only.
- **Error handling**: every `useMutation` has an `onError` that surfaces a `toast`. No silent catch, no `console.error`-as-only-handler. Handle the known structured `code` values (e.g. last-admin / inactive guards) where the server returns them.
- **Naming**: `staffApi.ts`, `useStaff.ts`, `components/staff/StaffForm.tsx`, query keys are kebab-case strings (`["staff"]`). Route files kebab/lowercase folders.
- **TS strictness**: no `any` (use `unknown` + narrow), handle `T | undefined` from array access, no non-null `!` without justification.
- **Definition of done per phase**: `pnpm --filter pos-desktop lint` clean, `tsc` clean, route renders, mutations invalidate caches and toast on error.

---

## Phase 1 — Data layer (`apis` + `dto` + `hooks`)

No UI in this phase. Build and type-check the full server-state plumbing first.

1. **`dto/staff.dto.ts`** — define `z.object` + `z.infer` for app-only shapes:
   - `StaffViewSchema` (id, name, username, email, phone, avatar, role, isActive, hasPosAccess, branchId, `branch: { id, name } | null`, lastLoginAt, isPinSet, createdAt, updatedAt) → `StaffView`.
   - `StaffDetailSchema` = `StaffViewSchema.extend({ recentActivity: StaffActivityLog[], activeSession: StaffSession | null })`. Reuse `StaffActivityLogSchema` / `StaffSessionSchema` shapes from `@repo/types` where possible; do **not** reconstruct enums.
   - Keep request input types imported from `@repo/types` (`CreateStaffInput`, `UpdateStaffInput`, `SetPinInput`, `ResetPasswordInput`) — do not duplicate them here.
2. **`apis/staffApi.ts`** — one `staffApi` object of pure async functions, one per endpoint in the table above. Pattern copied from [customerApi.ts](apps/pos-desktop/src/apis/customerApi.ts): build query params, return `response.data`, typed return values. No hooks, no store imports.
3. **`hooks/useStaff.ts`** — TanStack Query wrappers, `const STAFF_QUERY_KEY = ["staff"]`:
   - Queries: `useStaffList(query)`, `useStaffMember(id)`, `useStaffActivity(id, query)`.
   - Mutations: `useCreateStaff`, `useUpdateStaff`, `useToggleStaffActive`, `useToggleStaffPos`, `useSetStaffPin`, `useResetStaffPassword`, `useEndStaffSession`.
   - Every mutation `onSuccess` invalidates `STAFF_QUERY_KEY` and, for single-record ops, `[...STAFF_QUERY_KEY, id]`. Every mutation has `onError` → `toast`.

**Exit criteria:** `tsc` passes; hooks importable; zero JSX in `apis`/`hooks`; no component imports yet.

---

## Phase 2 — Staff list route + create/edit form

1. **Route `routes/staff/index.tsx`** (`createFileRoute("/staff/")`, `staticData.breadcrumb: "Staff"`). Model on [customers/index.tsx](apps/pos-desktop/src/routes/customers/index.tsx):
   - `DataTable` fed by `useStaffList`, with `search` (name/username/email), server pagination, `onRefetch`.
   - Filter controls (`SelectField`/`Combobox`): role, branch (from `useBranches`), `isActive`, `hasPosAccess` → fed into the `StaffQuery` passed to the hook.
   - "Add Staff" `Button` (ADMIN only) opens the create modal via `useModalStore.openModal`.
2. **`constants/columns/staffColumn.tsx`** — `getStaffColumns()` returning `ColumnDef<StaffView>[]`: Avatar/initials, Name, Username, Role (`Badge`), Branch, Active (`Badge`), POS access (icon), PIN set (icon), Last login, row actions (View → detail route, Edit, Toggle). Disable/grey actions the actor can't manage (compare actor role from `useAuthStore` against row role using the same hierarchy logic) — defense-in-UX; server still enforces.
3. **`components/staff/StaffForm.tsx`** — one form, create + edit (presence of a `staff` prop switches mode), mirroring [CustomerForm.tsx](apps/pos-desktop/src/components/customer/CustomerForm.tsx):
   - Create fields: name, username, password, role (`SelectField`, exclude `SYSTEM_ADMIN`), branch (`Combobox` from `useBranches`), email, phone, avatar, `hasPosAccess` (`SwitchField`, default `false` for KITCHEN/INVENTORY_STAFF), optional PIN.
   - Edit fields: name, role, branch, email, phone, avatar only. **`username` and `password` are not editable here** — render username read-only; password is reset via its own modal (Phase 3). Field constraints mirror `CreateStaffSchema` / `UpdateStaffSchema` (e.g. username ≥ 3, password ≥ 6, PIN 4–6 digits).
   - On submit call `useCreateStaff`/`useUpdateStaff`; `closeModal` on success; `onError` toast.
4. **Sidebar** — add a Staff entry to [nav-drawer/config.ts](apps/pos-desktop/src/components/nav-drawer/config.ts): `href: "/staff"`, an appropriate `icon` (e.g. `"Users"`), `showFor: ["RETAIL", "RESTAURANT"]`, `roles: ["ADMIN", "MANAGER"]`.

**Exit criteria:** list loads with working filters/pagination/search; create + edit round-trip and refresh the table; sidebar entry visible only to ADMIN/MANAGER.

---

## Phase 3 — Staff detail route + security actions

1. **Route `routes/staff/$staffId.tsx`** (`createFileRoute("/staff/$staffId")`, breadcrumb "Staff Details"), structured like [customers/$customerId.tsx](apps/pos-desktop/src/routes/customers/$customerId.tsx) with a `Skeleton` loading state and a not-found fallback that links back to `/staff`:
   - **Header**: avatar initials, name, role `Badge`, branch, plus status chips for `isActive`, `hasPosAccess`, `isPinSet`.
   - **Stat cards** (`Shad.Card`): Last login, Member since, Active session (started-at + branch/device, or "None").
   - **Action bar** (gated by `useAuthStore` role + hierarchy): Edit (reopen `StaffForm`), Set PIN, Reset Password, Toggle POS access, Toggle Active (**ADMIN only**), End Session (only when `activeSession != null`).
   - **Recent activity**: `DataTable` of `recentActivity` (action, module, date).
2. **`components/staff/SetPinForm.tsx`** — single numeric field, validates 4–6 digits (mirror `SetPinSchema`), calls `useSetStaffPin`, toasts `{ message }`, closes modal.
3. **`components/staff/ResetPasswordForm.tsx`** — single password field, min 6 (mirror `ResetPasswordSchema`), calls `useResetStaffPassword`. Surface that this revokes the member's existing login sessions (server clears `refreshToken`).
4. **Toggle + End-session actions** — call `useToggleStaffActive` / `useToggleStaffPos` / `useEndStaffSession`. End-session and deactivate go through a confirm dialog (`Shad.AlertDialog` or the existing modal). Handle server guard errors (e.g. "Cannot deactivate the last active admin", "Cannot grant POS access to an inactive staff member") via `onError` toast.

**Exit criteria:** detail page renders all sections; every security action works, invalidates `[...["staff"], id]` + `["staff"]`, and toasts on both success and known error codes.

---

## Phase 4 — Activity log view + polish

1. **Activity surface** — either a `Tabs` panel on the detail route or a sub-section, backed by `useStaffActivity(id, query)` with its own pagination:
   - `DataTable` columns: Date, Action, Module. Optional: render `metadata` (untyped `Json?`) as a read-only key/value popover — keep it defensive (it can be null/any shape).
   - Filters: module `SelectField` (values from `StaffActivityModule`), date range (`date-picker`) → mapped to `from`/`to`/`module` in `StaffActivityQuery`.
2. **Empty/loading/error states** — `Skeleton` while loading, `Empty` component for no rows, toast on query error. No raw spinners outside `@repo/ui`.
3. **Role-gated UX pass** — final audit that MANAGER never sees enabled mutating controls on ADMIN/MANAGER rows, "Add Staff" and "Toggle Active" are ADMIN-only, and `SYSTEM_ADMIN` never appears in role pickers. (Visual only — server remains authoritative.)
4. **Verification** — `pnpm --filter pos-desktop lint` and `tsc` clean; manual pass through create → edit → set-pin → reset-password → toggle → end-session → view activity. No `console.log` in committed paths; no dead/commented code.

**Exit criteria:** activity log filterable and paginated; all states handled; role gating verified end-to-end.

---

## Out of scope / explicit non-goals

- No new npm dependency, UI library, HTTP client, form library, or styling approach.
- No backend changes — the staff module is complete (list, create, edit, toggles, set-pin, reset-password, activity, end-session all exist).
- No server state in Zustand; no UI state in TanStack Query. `useModalStore` stays the only modal mechanism.
- No editing of `username`/`password` through the update form; no surfacing of `pinHash`/`password`/`refreshToken` anywhere.

## File checklist

```
apps/pos-desktop/src/
├── apis/staffApi.ts                          (Phase 1)
├── dto/staff.dto.ts                          (Phase 1)
├── hooks/useStaff.ts                         (Phase 1)
├── constants/columns/staffColumn.tsx         (Phase 2)
├── components/staff/StaffForm.tsx            (Phase 2)
├── components/staff/SetPinForm.tsx           (Phase 3)
├── components/staff/ResetPasswordForm.tsx    (Phase 3)
├── routes/staff/index.tsx                    (Phase 2)
├── routes/staff/$staffId.tsx                 (Phase 3 + 4)
└── components/nav-drawer/config.ts           (Phase 2 — edit)
```
