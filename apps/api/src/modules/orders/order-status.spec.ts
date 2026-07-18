import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BusinessType, OrderStatus, UserRole } from '@repo/types';
import { describe, expect, it } from 'vitest';
import { assertRoleCanTransition, assertTransition } from './order-status.js';

const ALL = Object.values(OrderStatus);

/**
 * Exhaustive decision table for the fulfillment state machine. Every from→to
 * pair is asserted for both business types, so adding/removing a transition
 * in `@repo/types` without updating this table fails loudly.
 */

const RESTAURANT_ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PLACED, OrderStatus.CANCELLED],
  [OrderStatus.PLACED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [
    OrderStatus.SERVED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SERVED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

const RETAIL_ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [
    OrderStatus.PLACED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PLACED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [],
  [OrderStatus.READY]: [],
  [OrderStatus.SERVED]: [],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

describe('assertTransition', () => {
  const cases: Array<{
    businessType: BusinessType;
    table: Record<OrderStatus, OrderStatus[]>;
  }> = [
    { businessType: BusinessType.RESTAURANT, table: RESTAURANT_ALLOWED },
    { businessType: BusinessType.RETAIL, table: RETAIL_ALLOWED },
  ];

  for (const { businessType, table } of cases) {
    describe(businessType, () => {
      for (const from of ALL) {
        for (const to of ALL) {
          const allowed = from === to || table[from].includes(to);
          it(`${from} → ${to}: ${allowed ? 'allowed' : 'rejected'}`, () => {
            if (allowed) {
              expect(() =>
                assertTransition(businessType, from, to),
              ).not.toThrow();
            } else {
              expect(() => assertTransition(businessType, from, to)).toThrow(
                BadRequestException,
              );
            }
          });
        }
      }
    });
  }

  it('terminal statuses have no exits (spot checks from the brief)', () => {
    // READY → DRAFT, COMPLETED → PREPARING, CANCELLED → PREPARING
    for (const businessType of [BusinessType.RESTAURANT, BusinessType.RETAIL]) {
      expect(() =>
        assertTransition(businessType, OrderStatus.READY, OrderStatus.DRAFT),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(
          businessType,
          OrderStatus.COMPLETED,
          OrderStatus.PREPARING,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(
          businessType,
          OrderStatus.CANCELLED,
          OrderStatus.PREPARING,
        ),
      ).toThrow(BadRequestException);
    }
  });
});

describe('assertRoleCanTransition (permission matrix)', () => {
  type Row = {
    from: OrderStatus;
    to: OrderStatus;
    allowed: UserRole[];
  };

  // Deny-by-default: any role not listed must be rejected.
  const MATRIX: Row[] = [
    {
      from: OrderStatus.DRAFT,
      to: OrderStatus.PLACED,
      allowed: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.WAITER,
        UserRole.DRIVER,
      ],
    },
    {
      from: OrderStatus.DRAFT,
      to: OrderStatus.CANCELLED,
      allowed: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.WAITER,
      ],
    },
    {
      from: OrderStatus.PLACED,
      to: OrderStatus.PREPARING,
      allowed: [UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN],
    },
    {
      from: OrderStatus.PREPARING,
      to: OrderStatus.READY,
      allowed: [UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN],
    },
    {
      from: OrderStatus.READY,
      to: OrderStatus.SERVED,
      allowed: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.WAITER,
        UserRole.DRIVER,
      ],
    },
    {
      from: OrderStatus.READY,
      to: OrderStatus.COMPLETED,
      allowed: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.WAITER,
        UserRole.DRIVER,
      ],
    },
    {
      from: OrderStatus.SERVED,
      to: OrderStatus.COMPLETED,
      allowed: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.WAITER,
        UserRole.DRIVER,
      ],
    },
    // Post-fire cancellation: manager/admin only — kitchen and floor staff
    // may never void a fired order.
    {
      from: OrderStatus.PLACED,
      to: OrderStatus.CANCELLED,
      allowed: [UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      from: OrderStatus.PREPARING,
      to: OrderStatus.CANCELLED,
      allowed: [UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      from: OrderStatus.READY,
      to: OrderStatus.CANCELLED,
      allowed: [UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      from: OrderStatus.SERVED,
      to: OrderStatus.CANCELLED,
      allowed: [UserRole.ADMIN, UserRole.MANAGER],
    },
  ];

  const ALL_ROLES = Object.values(UserRole);

  for (const { from, to, allowed } of MATRIX) {
    for (const role of ALL_ROLES) {
      const ok = allowed.includes(role);
      it(`${role}: ${from} → ${to} ${ok ? 'allowed' : 'forbidden'}`, () => {
        if (ok) {
          expect(() => assertRoleCanTransition(role, from, to)).not.toThrow();
        } else {
          expect(() => assertRoleCanTransition(role, from, to)).toThrow(
            ForbiddenException,
          );
        }
      });
    }
  }

  it('kitchen can never complete or cancel an order', () => {
    for (const from of ALL) {
      if (from === OrderStatus.COMPLETED) continue;
      expect(() =>
        assertRoleCanTransition(
          UserRole.KITCHEN,
          from,
          OrderStatus.COMPLETED,
        ),
      ).toThrow(ForbiddenException);
      if (from !== OrderStatus.CANCELLED) {
        expect(() =>
          assertRoleCanTransition(
            UserRole.KITCHEN,
            from,
            OrderStatus.CANCELLED,
          ),
        ).toThrow(ForbiddenException);
      }
    }
  });

  it('same-status is a permitted no-op for any role', () => {
    for (const role of ALL_ROLES) {
      for (const status of ALL) {
        expect(() =>
          assertRoleCanTransition(role, status, status),
        ).not.toThrow();
      }
    }
  });
});
