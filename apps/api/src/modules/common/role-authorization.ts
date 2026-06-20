import { ForbiddenException } from '@nestjs/common';
import {
  UserRole,
  canManageRole,
  isAssignableRole,
  isPrivilegedRole,
} from '@repo/types';

/**
 * NestJS-flavored guards over the shared staff role hierarchy. The decision
 * itself lives in `@repo/types` (`roles.ts`) so the backend and the POS UI
 * agree; these wrappers only translate a denial into the right HTTP exception
 * and message. See `role-authorization.spec.ts` for the decision table.
 */

// Re-exported so the rest of the API (and the spec) has one import surface.
export { isPrivilegedRole };

/** SYSTEM_ADMIN can never be assigned through tenant staff management. */
export function assertAssignableRole(role: UserRole): void {
  if (!isAssignableRole(role)) {
    throw new ForbiddenException('Cannot assign the SYSTEM_ADMIN role to staff');
  }
}

/**
 * Enforce that `actorRole` may manage an account with `targetRole` (or assign
 * `targetRole` to one). Self-contained (defense in depth): never assumes an
 * upstream guard already restricted the caller.
 */
export function assertCanManageRole(
  actorRole: UserRole,
  targetRole: UserRole,
): void {
  if (canManageRole(actorRole, targetRole)) {
    return;
  }

  // Denied — surface the most specific reason.
  if (!isAssignableRole(targetRole)) {
    throw new ForbiddenException('Cannot assign the SYSTEM_ADMIN role to staff');
  }
  if (actorRole === UserRole.MANAGER) {
    throw new ForbiddenException(
      'Managers cannot manage or assign admin or manager accounts',
    );
  }
  throw new ForbiddenException(
    'You do not have permission to manage staff accounts',
  );
}
