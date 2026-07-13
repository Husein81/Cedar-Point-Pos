import type { TableOverview, TableStats } from "@/dto/tables.dto";
import { OrderStatus, TableShape } from "@repo/types";
import { TableNodeAction } from "./TableNode";

export type TableUiStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "PREPARING"
  | "READY"
  | "BILLING"
  | "RESERVED"
  | "DISABLED";

/** Display order for legends, filters, and stat rows. */
export const TABLE_UI_STATUSES: TableUiStatus[] = [
  "AVAILABLE",
  "OCCUPIED",
  "PREPARING",
  "READY",
  "BILLING",
  "RESERVED",
  "DISABLED",
];

type ActionSpec = {
  action: TableNodeAction;
  label: string;
  icon: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  managerOnly?: boolean;
};

export const TABLE_STATUS_OPTIONS = TABLE_UI_STATUSES.map((status) => ({
  label: status.charAt(0) + status.slice(1).toLowerCase().replace("_", " "),
  value: status,
}));

const PREPARING_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.IN_PROGRESS,
]);

const BILLING_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.PAID,
  OrderStatus.PARTIALLY_PAID,
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
    if (orderStatus && BILLING_ORDER_STATUSES.has(orderStatus))
      return "BILLING";
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
  /** Default node size in world px (w × h) when no saved geometry exists. */
  width: number;
  height: number;
  /** Extra classes shaping the node (radius, aspect). */
  className: string;
}

export const TABLE_SHAPE_CONFIG: Record<TableShape, TableShapeConfig> = {
  RECTANGLE: {
    label: "Rectangle",
    icon: "RectangleHorizontal",
    width: 168,
    height: 120,
    className: "rounded-xl",
  },
  SQUARE: {
    label: "Square",
    icon: "Square",
    width: 136,
    height: 136,
    className: "rounded-xl",
  },
  CIRCLE: {
    label: "Circle",
    icon: "Circle",
    width: 148,
    height: 148,
    className: "rounded-full",
  },
  OVAL: {
    label: "Oval",
    icon: "Egg",
    width: 176,
    height: 112,
    className: "rounded-full",
  },
  CUSTOM: {
    label: "Custom",
    icon: "Shapes",
    width: 160,
    height: 120,
    className: "rounded-xl",
  },
};

export const DEFAULT_TABLE_SHAPE: TableShape = TableShape.RECTANGLE;

/** Resolve a table's node size: saved geometry wins, then shape defaults. */
export const getTableSize = (table: {
  width?: number | null;
  height?: number | null;
  shape?: TableShape;
}): { width: number; height: number } => {
  const shapeConfig = TABLE_SHAPE_CONFIG[table.shape! ?? DEFAULT_TABLE_SHAPE];
  return {
    width: table.width ?? shapeConfig.width,
    height: table.height ?? shapeConfig.height,
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
    { action: "open", label: "Open Order", icon: "ReceiptText" },
    {
      action: "transfer",
      label: "Transfer",
      icon: "ArrowLeftRight",
      variant: "outline",
    },
  ],
  BILLING: [
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
