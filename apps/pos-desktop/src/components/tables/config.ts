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
): Array<{ title: string; count: number; icon: string }> => [
  {
    title: "Total Tables",
    count: stats?.total || 0,
    icon: "LayoutGrid",
  },
  {
    title: "Available",
    count: stats?.available || 0,
    icon: "CircleCheck",
  },
  {
    title: "Occupied",
    count: stats?.occupied || 0,
    icon: "Users",
  },
  {
    title: "Reserved",
    count: stats?.reserved || 0,
    icon: "Clock",
  },
];

export const statusColors: Record<TableStatus, string> = {
  AVAILABLE: "border-border bg-card",
  OCCUPIED: "border-border bg-card",
  RESERVED: "border-border bg-card",
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
