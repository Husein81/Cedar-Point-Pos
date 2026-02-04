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
  AVAILABLE:
    "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30",
  OCCUPIED:
    "border-red-500 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30",
  RESERVED:
    "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30",
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
