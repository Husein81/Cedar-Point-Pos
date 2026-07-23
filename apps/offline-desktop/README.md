# CedarPoint POS Offline (`apps/offline-desktop`)

A fully offline, single-business desktop POS. No API server, no cloud, no
tenants — everything lives in a local SQLite database and all communication
between the UI and the data layer goes through Electron IPC.

The UI mirrors `apps/pos-desktop` (same `@repo/ui` components, same layout,
header, nav drawer, and theming) but the data layer is brand new.

## Run

```bash
pnpm --filter offline-desktop dev
```

First launch shows the owner-setup screen (create the first account); after
that it boots to sign-in. The database lives at
`%APPDATA%/CedarPoint POS Offline/offline-pos.db`.

> Note: `scripts/dev-electron.cjs` strips `ELECTRON_RUN_AS_NODE` before
> spawning Electron — terminals embedded in Electron apps (VS Code) export it,
> which would otherwise make Electron run as plain Node and crash on
> `require("electron")`.

## Architecture

```
Renderer (React)                     Main process (Electron)
─────────────────                    ───────────────────────
components/  → hooks/ (TanStack Query)
                 │
                 ▼
             lib/ipc.ts  ──invoke──▶  core/ipc-registry.ts   (Zod-validates EVERY input)
                                          │
                                      services/              (business logic, transactions)
                                          │
                                      repositories/          (prepared statements only)
                                          │
                                      database/  better-sqlite3 + versioned migrations
```

- **`src/shared/`** — the contract both processes compile against:
  `enums.ts`, `models.ts` (IPC-safe shapes), `schemas.ts` (Zod — used by main
  for validation *and* by React Hook Form), `ipc-contract.ts` (channel → 
  input/output map), `financial.ts` (money math shared so the cart preview
  always matches the persisted totals).
- **IPC safety** — the preload whitelists channels; the registry wraps every
  handler in `{ ok, data | error }` envelopes; raw exceptions never cross.
- **Auth** — local users, bcryptjs (cost 12), constant-time login (one bcrypt
  compare on every path), first user becomes OWNER. Roles: OWNER / MANAGER /
  CASHIER.
- **Checkout** — totals recomputed server-side from stored product data;
  stock deduction, payments, invoice-number claim, and drawer cash movement
  run in one better-sqlite3 transaction.
- **Migrations** — `database/migrations.ts`, keyed by `PRAGMA user_version`,
  append-only.
- **Backup** — SQLite online-backup export; restore validates the file
  (integrity check + settings table) and keeps a `.pre-restore` safety copy.

## Adding a feature (the pattern)

1. Add types to `shared/models.ts` and a Zod schema to `shared/schemas.ts`.
2. Add the channel to `shared/ipc-contract.ts` **and** the preload whitelist.
3. Repository method → service method → `registerHandler` in
   `ipc/register-handlers.ts`.
4. Renderer: TanStack Query hook in `hooks/`, then components/routes.

## Future sync-readiness

Every row carries ISO `createdAt`/`updatedAt`; IDs are UUIDs; deletes are
soft (`deletedAt`). Adding cloud sync later = one migration for a
`syncedAt`/dirty flag + a sync service in main. Nothing in the renderer
would change.

## Sales screen

Rebuilt to match `apps/pos-desktop`'s order screen pixel-for-pixel rather
than a simplified version:

- **Multi-tab draft orders** (`store/orderStore.ts`) — each tab is an
  independent in-progress sale (client-only state; nothing persists until
  checkout). Replaces a plain hold/resume dialog with the same tab strip UX
  as pos-desktop.
- **Tap-to-edit keypad** (`components/sales/Keypad/`) — tapping a cart line
  opens an inline numeric keypad with Qty/Price/Discount/Note context tabs,
  physical-keyboard passthrough, and a "diff" mode for price overrides.
  Driven by `store/keypadStore.ts`, mirroring pos-desktop's keypad store 1:1
  (minus contexts that don't apply offline: shipping fee, guest count,
  permission-gated price override).
- **Per-line + order-level discounts** — `order_items` already carried
  `discountType`/`discountValue`; this phase wires it into the UI via the
  keypad's Discount tab and `ApplyDiscount` scope picker.
- Product grid: image tiles, low-stock badge, in-cart quantity badge,
  category filter chips, type-to-search, Ctrl+F.

## Status / roadmap

Implemented: auth + setup, sales screen (as above), orders (search, filters,
details, partial refunds with stock restore), products, categories,
customers, employees, inventory (movements, adjustments, low-stock),
cash register (shifts, cash in/out, expected vs actual), settings
(business/tax/currency/receipt/theme), backup/restore.

Not yet built (next phases): dashboard, reports, expenses, receipt printer
output (thermal + A4 PDF), purchase-order UI for `stock:purchase`, loyalty,
coupons, keyboard-shortcut palette, virtualized tables.
