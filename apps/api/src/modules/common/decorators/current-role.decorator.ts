import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@repo/types';

/**
 * Extracts the authenticated user's role from the request. Throws
 * UnauthorizedException if no role is present (mirrors {@link CurrentTenant}).
 *
 * @example
 * @Patch(':id')
 * update(@CurrentRole() actorRole: UserRole) { ... }
 */
export const CurrentRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserRole => {
    const request = ctx.switchToHttp().getRequest<{ user?: { role?: UserRole } }>();
    const role = request.user?.role;

    if (!role) {
      throw new UnauthorizedException('User role not found in request');
    }

    return role;
  },
);
