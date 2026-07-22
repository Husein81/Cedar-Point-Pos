import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Extracts the authenticated user's id from the request. Throws
 * UnauthorizedException if no id is present (mirrors {@link CurrentTenant}).
 *
 * @example
 * @Post()
 * create(@CurrentUserId() userId: string) { ... }
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { id?: string } }>();
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User id not found in request');
    }

    return userId;
  },
);
