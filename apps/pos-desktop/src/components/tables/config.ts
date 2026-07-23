import type { TableOverview, TableStats } from "@/dto/tables.dto";
import {
  OrderStatus,
  PaymentStatus,
  TableShape,
  TABLE_SHAPE_DEFAULT_SIZE,
} from "@repo/types";
import { TableNodeAction } from "./TableNode";

export type TableUiStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "PREPARING"
  | "READY"
  | "BILLING"
  | "RESERVED"
  | "DISABLED";

export const TABLE_UI_STATUSES: TableUiStatus[] = [
  "AVAILABLE",
  "OCCUPIED",
  "PREPARING",
  "READY",
  "BILLING",
  "RESERVED",
  "DISABLED",
];

export const TABLE_STATUS_OPTIONS = TABLE_UI_STATUSES.map((status) => ({
  label: status.charAt(0) + status.slice(1).toLowerCase().replace("_", " "),
  value: status,
}));

const PREPARING_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.PLACED,
  OrderStatus.PREPARING,
]);

export const deriveTableUiStatus = (
  table: Pick<TableOverview, "status" | "isActive">,
  orderStatus?: OrderStatus | null,
): TableUiStatus => {
  if (!table.isActive) return "DISABLED";
  if (table.status === "RESERVED") return "RESERVED";
  if (table.status === "OCCUPIED") {
    if (orderStatus && PREPARING_ORDER_STATUSES.has(orderStatus))
      return "PREPARING";
    if (orderStatus === OrderStatus.READY) return "READY";
    // Food delivered, bill open (unpaid, partial, or paid awaiting close).
    if (orderStatus === OrderStatus.SERVED) return "BILLING";
    return "OCCUPIED";
  }
  return "AVAILABLE";
};

export interface TableUiStatusConfig {
  label: string;
  icon: string;
  badge: string;
  node: string;
  text: string;
  dot: string;
}

export const TABLE_UI_STATUS_CONFIG: Record<
  TableUiStatus,
  TableUiStatusConfig
> = {
  AVAILABLE: {
    label: "Available",
    icon: "CircleCheck",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    node: "bg-emerald-50/70 border-emerald-300 hover:border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:border-emerald-600",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  OCCUPIED: {
    label: "Occupied",
    icon: "Users",
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    node: "bg-blue-50/70 border-blue-300 hover:border-blue-400 dark:bg-blue-950/30 dark:border-blue-800 dark:hover:border-blue-600",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  PREPARING: {
    label: "Preparing",
    icon: "ChefHat",
    badge:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    node: "bg-purple-50/70 border-purple-300 hover:border-purple-400 dark:bg-purple-950/30 dark:border-purple-800 dark:hover:border-purple-600",
    text: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  READY: {
    label: "Ready",
    icon: "BellRing",
    badge:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20",
    node: "bg-cyan-50/70 border-cyan-300 hover:border-cyan-400 dark:bg-cyan-950/30 dark:border-cyan-800 dark:hover:border-cyan-600",
    text: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  BILLING: {
    label: "Billing",
    icon: "Receipt",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    node: "bg-amber-50/70 border-amber-300 hover:border-amber-400 dark:bg-amber-950/30 dark:border-amber-800 dark:hover:border-amber-600",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  RESERVED: {
    label: "Reserved",
    icon: "CalendarClock",
    badge:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
    node: "bg-orange-50/70 border-orange-300 hover:border-orange-400 dark:bg-orange-950/30 dark:border-orange-800 dark:hover:border-orange-600",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  DISABLED: {
    label: "Disabled",
    icon: "Ban",
    badge: "bg-muted text-muted-foreground border-border",
    node: "bg-muted/60 border-border opacity-60",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
};

// ── Shapes ───────────────────────────────────────────────────────────────────

export interface TableShapeConfig {
  label: string;
  icon: string;
  width: number;
  height: number;
  className: string;
}

export const TABLE_SHAPE_CONFIG: Record<TableShape, TableShapeConfig> = {
  RECTANGLE: {
    label: "Rectangle",
    icon: "RectangleHorizontal",
    ...TABLE_SHAPE_DEFAULT_SIZE.RECTANGLE,
    className: "rounded-md",
  },
  SQUARE: {
    label: "Square",
    icon: "Square",
    ...TABLE_SHAPE_DEFAULT_SIZE.SQUARE,
    className: "rounded-md",
  },
  CIRCLE: {
    label: "Circle",
    icon: "Circle",
    ...TABLE_SHAPE_DEFAULT_SIZE.CIRCLE,
    className: "rounded-full",
  },
  OVAL: {
    label: "Oval",
    icon: "Egg",
    ...TABLE_SHAPE_DEFAULT_SIZE.OVAL,
    className: "rounded-full",
  },
  CUSTOM: {
    label: "Custom",
    icon: "Shapes",
    ...TABLE_SHAPE_DEFAULT_SIZE.CUSTOM,
    className: "rounded-3xl",
  },
};

export const DEFAULT_TABLE_SHAPE: TableShape = TableShape.RECTANGLE;

/** Resolve a table's node size: saved geometry wins, then shape defaults. */
export const getTableSize = (table: {
  width?: number | null;
  height?: number | null;
  shape?: TableShape;
}): { width: number; height: number } => {
  const shapeConfig = TABLE_SHAPE_CONFIG[table.shape ?? DEFAULT_TABLE_SHAPE];
  return {
    width: table.width || shapeConfig.width,
    height: table.height || shapeConfig.height,
  };
};

// ── Aggregate stats (computed client-side from the overview payload) ─────────

export interface TablesAggregateStats {
  total: number;
  byStatus: Record<TableUiStatus, number>;
  guests: number;
  openOrders: number;
  occupancyPercent: number;
}

export const buildTablesStats = (
  tables: TableOverview[],
): TablesAggregateStats => {
  const byStatus = Object.fromEntries(
    TABLE_UI_STATUSES.map((s) => [s, 0]),
  ) as Record<TableUiStatus, number>;

  let guests = 0;
  let openOrders = 0;

  for (const table of tables) {
    const uiStatus = deriveTableUiStatus(table, table.activeOrder?.status);
    byStatus[uiStatus] += 1;
    if (table.activeOrder) {
      openOrders += 1;
      guests += table.activeOrder.guestCount ?? 0;
    }
  }

  const active = tables.filter((t) => t.isActive).length;
  const inService =
    byStatus.OCCUPIED + byStatus.PREPARING + byStatus.READY + byStatus.BILLING;

  return {
    total: tables.length,
    byStatus,
    guests,
    openOrders,
    occupancyPercent: active > 0 ? Math.round((inService / active) * 100) : 0,
  };
};

// ── Presentation helpers ─────────────────────────────────────────────────────

/** "Terrace - T4" — the display convention used across the order screen. */
export const getTableDisplayName = (
  table: Pick<TableOverview, "name" | "floor">,
): string => (table.floor ? `${table.floor.name} - ${table.name}` : table.name);

/** True when a seated order's guest count exceeds the table's capacity. */
export const isOverCapacity = (
  guestCount: number | null | undefined,
  capacity: number,
): boolean => (guestCount ?? 0) > capacity;

/** Warning color for the over-capacity guest count (matches destructive tone). */
export const OVER_CAPACITY_TEXT_CLASS = "text-red-600 dark:text-red-400";

export const formatTableMoney = (value: string | number): string => {
  const amount = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(amount)) return "—";

  return `$${amount.toFixed(2)}`;
};

/** "58m" / "1h 12m" elapsed since the given ISO timestamp. */
export const formatElapsedSince = (iso: string, now: number): string => {
  const started = new Date(iso).getTime();

  if (!Number.isFinite(started) || started > now) return "0m";

  const minutes = Math.floor((now - started) / 60_000);

  if (minutes < 60) return `${minutes}m`;

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

type StatCard = {
  title: string;
  count: string | number;
  icon: string;
  iconColor: string;
  iconBg: string;
};

export const getStatsCards = (stats: TableStats): StatCard[] => [
  {
    title: "Total Tables",
    count: stats.total,
    icon: "Table",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    title: "Occupied / In Service",
    count: `${stats.occupied} / ${stats.total}`,
    icon: "Users",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    title: "Available",
    count: stats.available,
    icon: "CircleCheck",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    title: "Reserved",
    count: stats.reserved,
    icon: "CalendarClock",
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-50 dark:bg-orange-950/30",
  },
];

type ActionSpec = {
  action: TableNodeAction;
  label: string;
  icon: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  managerOnly?: boolean;
};

export const ACTIONS_BY_STATUS: Record<TableUiStatus, ActionSpec[]> = {
  AVAILABLE: [
    { action: "seat", label: "Seat Guests", icon: "Users" },
    {
      action: "reserve",
      label: "Reserve",
      icon: "CalendarClock",
      variant: "outline",
    },
  ],
  OCCUPIED: [
    { action: "open", label: "Open Order", icon: "ReceiptText" },
    {
      action: "transfer",
      label: "Transfer",
      icon: "ArrowLeftRight",
      variant: "outline",
    },
    {
      action: "free",
      label: "Free Table",
      icon: "CircleCheck",
      variant: "outline",
    },
  ],
  PREPARING: [
    { action: "open", label: "Open Order", icon: "ReceiptText" },
    {
      action: "transfer",
      label: "Transfer",
      icon: "ArrowLeftRight",
      variant: "outline",
    },
  ],
  READY: [
    { action: "serve", label: "Mark Served", icon: "Utensils" },
    { action: "open", label: "Open Order", icon: "ReceiptText" },
    {
      action: "transfer",
      label: "Transfer",
      icon: "ArrowLeftRight",
      variant: "outline",
    },
  ],
  BILLING: [
    { action: "pay", label: "Take Payment", icon: "Banknote" },
    { action: "complete", label: "Complete & Free Table", icon: "CircleCheck" },
    {
      action: "open",
      label: "View Invoice",
      icon: "ReceiptText",
      variant: "outline",
    },
    {
      action: "transfer",
      label: "Transfer",
      icon: "ArrowLeftRight",
      variant: "outline",
    },
  ],
  RESERVED: [
    { action: "seat", label: "Seat Guests", icon: "Users" },
    {
      action: "unreserve",
      label: "Clear Reservation",
      icon: "CalendarX",
      variant: "outline",
    },
  ],
  DISABLED: [
    {
      action: "enable",
      label: "Enable Table",
      icon: "Power",
      managerOnly: true,
    },
    {
      action: "delete",
      label: "Delete",
      icon: "Trash2",
      variant: "destructive",
      managerOnly: true,
    },
  ],
};

interface MenuEntry {
  action: TableNodeAction;
  label: string;
  icon: string;
  destructive?: boolean;
  managerOnly?: boolean;
}

export const MENU_BY_STATUS: Record<TableUiStatus, MenuEntry[]> = {
  AVAILABLE: [
    { action: "seat", label: "Seat Guests", icon: "Users" },
    { action: "reserve", label: "Reserve Table", icon: "CalendarClock" },
    { action: "edit", label: "Edit Table", icon: "Pencil", managerOnly: true },
    {
      action: "disable",
      label: "Disable Table",
      icon: "Ban",
      managerOnly: true,
      destructive: true,
    },
  ],
  OCCUPIED: [
    { action: "open", label: "Open Order", icon: "ReceiptText" },
    { action: "transfer", label: "Transfer Table", icon: "ArrowLeftRight" },
  ],
  PREPARING: [
    { action: "open", label: "Open Order", icon: "ReceiptText" },
    { action: "transfer", label: "Transfer Table", icon: "ArrowLeftRight" },
  ],
  READY: [
    { action: "serve", label: "Mark Served", icon: "Utensils" },
    { action: "open", label: "Open Order", icon: "ReceiptText" },
    { action: "transfer", label: "Transfer Table", icon: "ArrowLeftRight" },
  ],
  BILLING: [
    { action: "open", label: "View Invoice", icon: "ReceiptText" },
    { action: "pay", label: "Take Payment", icon: "Banknote" },
    { action: "complete", label: "Complete & Free Table", icon: "CircleCheck" },
    { action: "transfer", label: "Transfer Table", icon: "ArrowLeftRight" },
  ],
  RESERVED: [
    { action: "seat", label: "Seat Guests", icon: "Users" },
    { action: "unreserve", label: "Clear Reservation", icon: "CalendarX" },
  ],
  DISABLED: [
    {
      action: "enable",
      label: "Enable Table",
      icon: "Power",
      managerOnly: true,
    },
    {
      action: "delete",
      label: "Delete Table",
      icon: "Trash2",
      managerOnly: true,
      destructive: true,
    },
  ],
};

/**
 * Payment gating for the BILLING actions: "pay" only while a balance is
 * owed, "complete" only once fully paid — mirrors the backend guard that
 * rejects COMPLETED for an unpaid order.
 */
const isBillingActionVisible = (
  action: TableNodeAction,
  paymentStatus?: PaymentStatus,
): boolean => {
  if (action === "pay") return paymentStatus !== PaymentStatus.PAID;
  if (action === "complete") return paymentStatus === PaymentStatus.PAID;
  return true;
};

export const getVisibleActions = (
  uiStatus: TableUiStatus,
  canManage: boolean,
  paymentStatus?: PaymentStatus,
): ActionSpec[] =>
  ACTIONS_BY_STATUS[uiStatus].filter(
    (a) =>
      (!a.managerOnly || canManage) &&
      isBillingActionVisible(a.action, paymentStatus),
  );

export const getVisibleMenuEntries = (
  uiStatus: TableUiStatus,
  canManage: boolean,
  paymentStatus?: PaymentStatus,
): MenuEntry[] =>
  MENU_BY_STATUS[uiStatus].filter(
    (entry) =>
      (!entry.managerOnly || canManage) &&
      isBillingActionVisible(entry.action, paymentStatus),
  );
