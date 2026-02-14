import { TableStats } from "@/dto/tables.dto";
import { TableStatus } from "@repo/types";

export const TABLE_STATUS_OPTIONS: { label: string; value: TableStatus }[] = [
  { label: "Available", value: TableStatus.AVAILABLE },
  {
    label: "Occupied",
    value: TableStatus.OCCUPIED,
  },
  { label: "Reserved", value: TableStatus.RESERVED },
];

export const getStatsCards = (
  stats: TableStats,
): Array<{
  title: string;
  count: number;
  icon: string;
  iconBg: string;
  iconColor: string;
}> => [
  {
    title: "Total Tables",
    count: stats?.total || 0,
    icon: "LayoutGrid",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
  },
  {
    title: "Available",
    count: stats?.available || 0,
    icon: "CircleCheck",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Occupied",
    count: stats?.occupied || 0,
    icon: "Users",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    iconColor: "text-red-600 dark:text-red-400",
  },
  {
    title: "Reserved",
    count: stats?.reserved || 0,
    icon: "Clock",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
];

export const statusColors: Record<TableStatus, string> = {
  AVAILABLE:
    "border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20",
  OCCUPIED:
    "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20",
  RESERVED:
    "border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20",
};

export const statusIcons: Record<TableStatus, string> = {
  AVAILABLE: "CircleCheck",
  OCCUPIED: "Users",
  RESERVED: "Clock",
};

export const STATUS_OPTIONS: {
  value: TableStatus;
  label: string;
  icon: string;
}[] = [
  { value: "AVAILABLE", label: "Available", icon: "CircleCheck" },
  { value: "OCCUPIED", label: "Occupied", icon: "Users" },
  { value: "RESERVED", label: "Reserved", icon: "Clock" },
];

export const TABLE_STATUS_CONFIG: Record<
  TableStatus,
  { label: string; className: string }
> = {
  AVAILABLE: {
    label: "Available",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  OCCUPIED: {
    label: "Occupied",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  RESERVED: {
    label: "Reserved",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  },
};

export const STATUS_BADGE: Record<string, { label: string; className: string }> =
  {
    DRAFT: {
      label: "Draft",
      className:
        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    ON_HOLD: {
      label: "On Hold",
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    },
    PENDING: {
      label: "Pending",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    },
    CONFIRMED: {
      label: "Confirmed",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
    SENT_TO_KITCHEN: {
      label: "Kitchen",
      className:
        "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    },
    IN_PROGRESS: {
      label: "In Progress",
      className:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    },
    READY: {
      label: "Ready",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
    PAID: {
      label: "Paid",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    },
    PARTIALLY_PAID: {
      label: "Partial Pay",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    },
  };
