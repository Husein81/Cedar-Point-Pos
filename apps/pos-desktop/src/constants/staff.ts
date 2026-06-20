import { UserRole } from "@repo/types";

// Display labels for roles. SYSTEM_ADMIN is included for completeness but is
// never assignable/listable through tenant staff management.
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

// The list of tenant-assignable roles lives in `@repo/types` (ASSIGNABLE_ROLES)
// alongside the hierarchy predicates — import it from there.

// Roles that don't operate the POS register — POS access defaults off when
// creating one of these.
export const NON_POS_ROLES: UserRole[] = [
  UserRole.KITCHEN,
  UserRole.INVENTORY_STAFF,
];
