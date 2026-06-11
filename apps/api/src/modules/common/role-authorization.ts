import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@repo/types';

/**
 * Pure authorization helpers for tenant staff management. Centralized here so
 * the role hierarchy is enforced identically wherever staff or their PINs are
 * managed (staff module, auth module), and changes in one place only.
 */

// Roles that grant elevated, tenant-wide privileges.
const PRIVILEGED_ROLES: readonly UserRole[] = [
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

export function isPrivilegedRole(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

/** SYSTEM_ADMIN can never be assigned through tenant staff management. */
export function assertAssignableRole(role: UserRole): void {
  if (role === UserRole.SYSTEM_ADMIN) {
    throw new ForbiddenException(
      'Cannot assign the SYSTEM_ADMIN role to staff',
    );
  }
}

/**
 * Enforce that the acting user may manage an account with `targetRole` (or
 * assign `targetRole` to one):
 * - ADMIN may manage any assignable role (including other admins/managers).
 * - MANAGER may manage only non-privileged staff (cashiers, kitchen, ...),
 *   which blocks a manager from escalating themselves or others to admin.
 * - Any other (non-privileged) actor may not manage staff at all.
 *
 * Self-contained by design: it never assumes an upstream guard already
 * restricted the caller, so it is safe to call from anywhere (defense in depth).
 * See `role-authorization.spec.ts` for the full decision table.
 */
export function assertCanManageRole(
  actorRole: UserRole,
  targetRole: UserRole,
): void {
  assertAssignableRole(targetRole);

  if (actorRole === UserRole.ADMIN) {
    return;
  }

  if (actorRole === UserRole.MANAGER) {
    if (isPrivilegedRole(targetRole)) {
      throw new ForbiddenException(
        'Managers cannot manage or assign admin or manager accounts',
      );
    }
    return;
  }

  throw new ForbiddenException(
    'You do not have permission to manage staff accounts',
  );
}
