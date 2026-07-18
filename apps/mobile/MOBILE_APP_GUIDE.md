# Cedar Point Mobile Ordering App

A React Native ordering app for waiters to create and manage customer orders, integrated with the existing POS backend.

## Quick Start

1. **Install dependencies** (one-time):
   ```bash
   pnpm install
   ```

2. **Start the API** (required):
   ```bash
   pnpm --filter api dev
   ```

3. **Start the mobile dev client**:
   ```bash
   pnpm --filter mobile start
   ```
   Then press `i` for iOS, `a` for Android, or `w` for web preview.

4. **Set the API URL** (if needed):
   - Edit `apps/mobile/.env`
   - Set `EXPO_PUBLIC_API_URL` to your API host (default: auto-detected from Metro)

## Architecture

### State Management
- **Auth**: `useAuthStore` (Zustand) — persistent tokens + user + hydration gate
- **Branch**: `useBranchStore` (Zustand) — current working branch
- **Cart**: `useCartStore` (Zustand) — draft order with items, totals, VAT toggle
- **Theme**: `useThemeStore` (Zustand) — light/dark mode
- **Server state**: TanStack Query (polling every 15s for orders/tables)

### Data Flow
- **APIs**: Pure async functions in `services/*.ts` (no React, no hooks)
- **Hooks**: TanStack Query wrappers in `hooks/use-*.ts` (queries + mutations + cache invalidation)
- **Components**: Call hooks, never call API functions directly

### Key Files

| File | Purpose |
|------|---------|
| `lib/api.ts` | Axios instance with auth interceptors + single-flight refresh |
| `lib/format.ts` | Money, date, status styling helpers |
| `types/index.ts` | Shared types mirroring API responses |
| `store/auth.ts` | Persisted session + hydration gate |
| `store/branch.ts` | Active branch |
| `store/cart.ts` | Draft order (items, VAT, totals) |
| `services/` | Pure API client functions |
| `hooks/use-*.ts` | TanStack Query wrappers |
| `components/app/` | Reusable order/product/table cards |
| `app/(tabs)/` | Home, Orders, Profile, Settings screens |
| `app/new-order/` | Table select → Menu → Cart → Send flow |
| `app/order/[id].tsx` | Order details + add items |

## The Ordering Flow

1. **Home** (`(tabs)/index.tsx`): Branch picker, today's stats, quick-action buttons
2. **New Order** → **Select Table** (`new-order/table.tsx`): Floor-grouped grid, Takeaway option
3. **Menu** (`new-order/menu.tsx`): Categories, search, 2-column product grid, quantity steppers
4. **Cart** (`new-order/cart.tsx`): Items, notes, guest count, VAT toggle, then **Send to Kitchen**
5. **Order Details** (`order/[id].tsx`): Live status, Add Items (re-enter menu/cart), Cancel with confirmation

## Design System

Matches the POS desktop app:
- **Colors**: Brand blue (primary), red (destructive), green (success), orange (warning)
- **Components**: shadcn-style UI kit + custom cards (OrderCard, ProductCard, TableCard, StatusBadge)
- **Animations**: Reanimated transitions, haptic feedback on success
- **Theme**: Light/dark via Taiwind `dark:` variant (Uniwind auto-applies)

## API Integration

Uses **only existing endpoints** from the backend:

| Endpoint | Purpose |
|----------|---------|
| `POST /auth/sign-in` | Login |
| `POST /auth/logout` | Logout (best-effort) |
| `POST /auth/refresh` | Token refresh (single-flight) |
| `GET /auth/me` | Current user |
| `GET /branches` | Branch list |
| `GET /categories` | Menu categories |
| `GET /products` | Menu items |
| `GET /tables/branch/:id/overview` | Floor plan with active orders |
| `POST /orders` | Create draft order |
| `GET /orders` | List orders (paginated, filterable) |
| `GET /orders/:id` | Order details |
| `POST /orders/:id/send-to-kitchen` | Send to kitchen |
| `POST /orders/:id/batch-items` | Add items to existing order |
| `PATCH /orders/:id/status` | Update status (e.g., cancel) |

## Error Handling

- **Network errors**: User sees "Unable to reach the server" (handled by axios)
- **API errors**: Normalized to `ApiError` with message + optional `code` (for client-side actions like "TABLE_HAS_ACTIVE_ORDER")
- **Auth errors**: 401 triggers refresh, then logout if refresh fails
- **Mutations**: All have `onError` handlers → Alert or Toast (not implemented yet; currently just Alerts)

## Real-time Updates

- **Polling**: Orders and tables refetch every 15s (no sockets installed)
- **Invalidation**: TanStack Query keys cleared on mutation (send-to-kitchen, add-item, cancel)
- **Refresh**: Pull-to-refresh on Orders and Order Details screens

## Known Limitations

- **No offline queueing**: Loses cart on disconnect (local squite not implemented)
- **No modifiers UI**: API supports modifiers; menu skips them for now
- **No customer selection**: New orders don't capture customer
- **No payment flow**: "Paid" status is read-only from the server
- **Polling only**: No WebSocket support (Socket.IO not installed)
- **No biometric**: Login always requires username + password

## Testing

```bash
# Typecheck
cd apps/mobile && npx tsc --noEmit

# Lint
pnpm --filter mobile lint

# No test suite yet (use /verify skill for manual testing)
```

## File Structure

```
apps/mobile/
├── app/                          # Expo Router app directory
│   ├── (auth)/sign-in.tsx        # Login screen
│   ├── (tabs)/                   # Bottom-tab navigation
│   │   ├── index.tsx             # Home dashboard
│   │   ├── orders.tsx            # Orders list
│   │   ├── profile.tsx           # User profile
│   │   └── settings.tsx          # Theme + about
│   ├── new-order/                # Create order flow
│   │   ├── table.tsx             # Select table
│   │   ├── menu.tsx              # Browse products
│   │   └── cart.tsx              # Review + send
│   ├── order/[id].tsx            # Order details + add items
│   └── _layout.tsx               # Root layout with auth guard
├── components/
│   ├── app/                      # App-specific components
│   │   ├── order-card.tsx
│   │   ├── product-card.tsx
│   │   ├── table-card.tsx
│   │   ├── status-badge.tsx
│   │   ├── chip.tsx
│   │   ├── quantity-stepper.tsx
│   │   ├── search-bar.tsx
│   │   ├── stat-card.tsx
│   │   ├── empty-state.tsx
│   │   ├── screen-header.tsx
│   │   └── index.ts
│   ├── form/                     # Form components
│   │   └── input-field.tsx
│   ├── ui/                       # Shadcn-style primitives
│   └── provider/                 # QueryClient + Zustand setup
├── hooks/                        # TanStack Query wrappers
│   ├── use-auth.ts
│   ├── use-orders.ts
│   ├── use-catalog.ts
│   ├── use-tables.ts
│   └── use-branches.ts
├── lib/
│   ├── api.ts                    # Axios instance + interceptors
│   ├── format.ts                 # Helpers (money, time, status)
│   ├── theme.ts                  # Design tokens
│   └── utils.ts                  # Tailwind merging
├── services/                     # Pure API functions (no React)
│   ├── auth.ts
│   ├── orders.ts
│   ├── catalog.ts
│   ├── tables.ts
│   └── branches.ts
├── store/                        # Zustand stores
│   ├── auth.ts
│   ├── branch.ts
│   ├── cart.ts
│   ├── theme.ts
│   └── theme.ts
├── types/                        # Shared TypeScript types
│   └── index.ts
├── global.css                    # Tailwind + Uniwind setup
├── metro.config.js               # Monorepo resolution
├── tsconfig.json                 # React type pinning
├── vitest.config.ts              # (Placeholder, not used yet)
├── package.json                  # Dependencies
├── app.json                       # Expo config
└── README.md
```

## Next Steps (Optional)

1. **Modifiers**: Add UI to select/customize modifiers when adding items
2. **Offline queueing**: Use better-sqlite3 to cache drafted orders, auto-sync on reconnect
3. **Customer selection**: Lookup or create customers before placing orders
4. **WebSocket**: Integrate Socket.IO for real-time updates instead of polling
5. **Payment flow**: Capture payment method + amount before sending to kitchen
6. **Biometric**: Add Expo AuthSession for fingerprint/face unlock
7. **Tests**: Add Jest/Vitest unit + integration tests

## Support

- **Backend**: See `apps/api` — uses NestJS + Prisma + Socket.IO
- **Design system**: Matches `apps/pos-desktop` (same colors, spacing, icons)
- **Deployment**: Expo Go (dev), EAS Build (prod), or bare Xcode/Android Studio
