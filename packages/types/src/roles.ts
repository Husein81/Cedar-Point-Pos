import { UserRole } from "./enums";

// Single source of truth for the tenant staff role hierarchy. Pure predicates
// (no framework deps) so the backend (assert wrappers in
// modules/common/role-authorization.ts) and the POS UI gate identically.

// Roles that grant elevated, tenant-wide privileges.
const PRIVILEGED_ROLES: readonly UserRole[] = [
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

// Roles a tenant can assign/list — everything except SYSTEM_ADMIN.
export const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CASHIER,
  UserRole.KITCHEN,
  UserRole.WAITER,
  UserRole.DRIVER,
  UserRole.INVENTORY_STAFF,
];

export function isPrivilegedRole(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

/** SYSTEM_ADMIN can never be assigned through tenant staff management. */
export function isAssignableRole(role: UserRole): boolean {
  return role !== UserRole.SYSTEM_ADMIN;
}

/**
 * Whether `actorRole` may manage an account with `targetRole` (or assign it):
 * - ADMIN may manage any assignable role.
 * - MANAGER may manage only non-privileged staff (blocks escalation to admin).
 * - Any other actor may not manage staff at all.
 * SYSTEM_ADMIN is never a manageable/assignable target.
 */
export function canManageRole(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  if (!isAssignableRole(targetRole)) return false;
  if (actorRole === UserRole.ADMIN) return true;
  if (actorRole === UserRole.MANAGER) return !isPrivilegedRole(targetRole);
  return false;
}

/** Roles `actorRole` may assign/manage through staff management. */
export function assignableRolesFor(actorRole: UserRole): UserRole[] {
  return ASSIGNABLE_ROLES.filter((role) => canManageRole(actorRole, role));
}
