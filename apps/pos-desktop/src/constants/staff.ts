import { UserRole } from "@repo/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  SYSTEM_ADMIN: "System Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
  WAITER: "Waiter",
  DRIVER: "Driver",
  INVENTORY_STAFF: "Inventory Staff",
};

export const NON_POS_ROLES: UserRole[] = [
  UserRole.KITCHEN,
  UserRole.INVENTORY_STAFF,
];
