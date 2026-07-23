// The IPC contract: one map of channel → { input, output }.
// Main registers handlers against it; the preload/renderer client derives
// its typed API from it. Adding a feature = adding an entry here first.

import type {
  Category,
  CategorySalesPoint,
  Color,
  Customer,
  DashboardSummary,
  HourlyRevenuePoint,
  Order,
  OrderWithDetails,
  Paginated,
  Product,
  Settings,
  Shift,
  StockMovement,
  Subcategory,
  TopProductPoint,
  User,
  WeeklySalesPoint,
} from "./models";
import type {
  CategoryInput,
  ColorInput,
  CustomerInput,
  DateRangeInput,
  ListCustomersInput,
  ListOrdersInput,
  ListProductsInput,
  ListStockMovementsInput,
  LoginInput,
  CheckoutInput,
  HoldOrderInput,
  ProductInput,
  RefundInput,
  StockAdjustmentInput,
  StockPurchaseInput,
  SubcategoryInput,
  TopProductsInput,
  UpdateSettingsInput,
  UserInput,
  UpdateUserInput,
  OpenShiftInput,
  CloseShiftInput,
  CashMovementInput,
} from "./schemas";

export type IpcContract = {
  // ── auth ────────────────────────────────────────────────────────────
  "auth:login": { input: LoginInput; output: User };
  "auth:logout": { input: void; output: void };
  "auth:bootstrap": { input: void; output: { hasUsers: boolean } };
  "auth:setup": { input: UserInput; output: User };
  // Re-establishes the main-process session from a locally-remembered user id
  // (see authStore) — re-validates the account still exists and is active
  // rather than trusting the renderer's stored id blindly.
  "auth:resume": { input: { userId: string }; output: User };

  // ── users ───────────────────────────────────────────────────────────
  "users:list": { input: void; output: User[] };
  "users:create": { input: UserInput; output: User };
  "users:update": { input: { id: string; data: UpdateUserInput }; output: User };
  "users:deactivate": { input: { id: string }; output: User };

  // ── categories ──────────────────────────────────────────────────────
  "categories:list": { input: void; output: Category[] };
  "categories:create": { input: CategoryInput; output: Category };
  "categories:update": {
    input: { id: string; data: CategoryInput };
    output: Category;
  };
  "categories:delete": { input: { id: string }; output: void };

  // ── subcategories ───────────────────────────────────────────────────
  "subcategories:create": {
    input: { categoryId: string; data: SubcategoryInput };
    output: Subcategory;
  };
  "subcategories:update": {
    input: { id: string; data: SubcategoryInput };
    output: Subcategory;
  };
  "subcategories:delete": { input: { id: string }; output: void };

  // ── colors ──────────────────────────────────────────────────────────
  "colors:list": { input: void; output: Color[] };
  "colors:create": { input: ColorInput; output: Color };
  "colors:update": { input: { id: string; data: ColorInput }; output: Color };
  "colors:delete": { input: { id: string }; output: void };
  "colors:seedDefaults": { input: void; output: { inserted: number } };

  // ── products ────────────────────────────────────────────────────────
  "products:list": { input: ListProductsInput; output: Paginated<Product> };
  "products:get": { input: { id: string }; output: Product };
  "products:getByBarcode": { input: { barcode: string }; output: Product | null };
  "products:create": { input: ProductInput; output: Product };
  "products:update": {
    input: { id: string; data: ProductInput };
    output: Product;
  };
  "products:delete": { input: { id: string }; output: void };

  // ── customers ───────────────────────────────────────────────────────
  "customers:list": { input: ListCustomersInput; output: Paginated<Customer> };
  "customers:create": { input: CustomerInput; output: Customer };
  "customers:update": {
    input: { id: string; data: CustomerInput };
    output: Customer;
  };
  "customers:delete": { input: { id: string }; output: void };

  // ── orders / sales ──────────────────────────────────────────────────
  "orders:checkout": { input: CheckoutInput; output: OrderWithDetails };
  "orders:hold": { input: HoldOrderInput; output: Order };
  "orders:listHeld": { input: void; output: OrderWithDetails[] };
  "orders:resume": { input: { id: string }; output: OrderWithDetails };
  "orders:list": { input: ListOrdersInput; output: Paginated<Order> };
  "orders:get": { input: { id: string }; output: OrderWithDetails };
  "orders:refund": { input: RefundInput; output: OrderWithDetails };

  // ── inventory ───────────────────────────────────────────────────────
  "stock:movements": {
    input: ListStockMovementsInput;
    output: Paginated<StockMovement>;
  };
  "stock:adjust": { input: StockAdjustmentInput; output: StockMovement };
  "stock:purchase": { input: StockPurchaseInput; output: StockMovement[] };
  "stock:lowStock": { input: void; output: Product[] };

  // ── shifts / cash register ──────────────────────────────────────────
  "shifts:current": { input: void; output: Shift | null };
  "shifts:open": { input: OpenShiftInput; output: Shift };
  "shifts:close": { input: CloseShiftInput; output: Shift };
  "shifts:cashMovement": { input: CashMovementInput; output: Shift };
  "shifts:list": { input: void; output: Shift[] };

  // ── settings ────────────────────────────────────────────────────────
  "settings:get": { input: void; output: Settings };
  "settings:update": { input: UpdateSettingsInput; output: Settings };

  // ── backup ──────────────────────────────────────────────────────────
  "backup:export": { input: void; output: { path: string } | null };
  "backup:restore": { input: void; output: { restored: boolean } };

  // ── dashboard ───────────────────────────────────────────────────────
  "dashboard:summary": { input: void; output: DashboardSummary };
  "dashboard:weeklySales": { input: void; output: WeeklySalesPoint[] };
  "dashboard:salesByCategory": {
    input: DateRangeInput;
    output: CategorySalesPoint[];
  };
  "dashboard:hourlyRevenue": { input: void; output: HourlyRevenuePoint[] };
  "dashboard:topProducts": {
    input: TopProductsInput;
    output: TopProductPoint[];
  };
};

export type IpcChannel = keyof IpcContract;
export type IpcInput<C extends IpcChannel> = IpcContract[C]["input"];
export type IpcOutput<C extends IpcChannel> = IpcContract[C]["output"];

// Serialized error envelope crossing the IPC boundary.
export type IpcError = {
  message: string;
  code: string;
};

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: IpcError };
