import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@repo/types';
import {
  assertAssignableRole,
  assertCanManageRole,
  isPrivilegedRole,
} from './role-authorization.js';

/**
 * Pure authorization logic — no Prisma, no Nest DI. Exercised as a decision
 * table so the role hierarchy is locked down against accidental regressions.
 */
describe('role-authorization', () => {
  describe('isPrivilegedRole', () => {
    it.each<[UserRole, boolean]>([
      [UserRole.SYSTEM_ADMIN, true],
      [UserRole.ADMIN, true],
      [UserRole.MANAGER, true],
      [UserRole.CASHIER, false],
      [UserRole.KITCHEN, false],
    ])('treats %s as privileged=%s', (role, expected) => {
      expect(isPrivilegedRole(role)).toBe(expected);
    });
  });

  describe('assertAssignableRole', () => {
    it('rejects assigning SYSTEM_ADMIN', () => {
      expect(() => assertAssignableRole(UserRole.SYSTEM_ADMIN)).toThrow(
        ForbiddenException,
      );
    });

    it.each<UserRole>([
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.CASHIER,
      UserRole.KITCHEN,
    ])('allows assigning %s', (role) => {
      expect(() => assertAssignableRole(role)).not.toThrow();
    });
  });

  describe('assertCanManageRole', () => {
    // [actorRole, targetRole] pairs the hierarchy must permit.
    const allowed: Array<[UserRole, UserRole]> = [
      [UserRole.ADMIN, UserRole.ADMIN],
      [UserRole.ADMIN, UserRole.MANAGER],
      [UserRole.ADMIN, UserRole.CASHIER],
      [UserRole.ADMIN, UserRole.KITCHEN],
      [UserRole.MANAGER, UserRole.CASHIER],
      [UserRole.MANAGER, UserRole.KITCHEN],
    ];

    // [actorRole, targetRole] pairs the hierarchy must reject.
    const denied: Array<[UserRole, UserRole]> = [
      // SYSTEM_ADMIN can never be assigned, even by an admin.
      [UserRole.ADMIN, UserRole.SYSTEM_ADMIN],
      // Managers cannot touch privileged accounts or escalate to them.
      [UserRole.MANAGER, UserRole.ADMIN],
      [UserRole.MANAGER, UserRole.MANAGER],
      [UserRole.MANAGER, UserRole.SYSTEM_ADMIN],
      // Non-privileged actors cannot manage anyone (defense in depth).
      [UserRole.CASHIER, UserRole.CASHIER],
      [UserRole.CASHIER, UserRole.KITCHEN],
      [UserRole.CASHIER, UserRole.ADMIN],
      [UserRole.KITCHEN, UserRole.CASHIER],
      // SYSTEM_ADMIN manages tenants through the dedicated module, not here.
      [UserRole.SYSTEM_ADMIN, UserRole.CASHIER],
    ];

    it.each(allowed)('allows %s to manage %s', (actorRole, targetRole) => {
      expect(() => assertCanManageRole(actorRole, targetRole)).not.toThrow();
    });

    it.each(denied)('denies %s managing %s', (actorRole, targetRole) => {
      expect(() => assertCanManageRole(actorRole, targetRole)).toThrow(
        ForbiddenException,
      );
    });
  });
});
