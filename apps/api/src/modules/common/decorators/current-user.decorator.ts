import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

type AuthenticatedUser = {
  id?: string;
  tenantId?: string;
  role?: string;
  username?: string;
  [key: string]: unknown;
};

export const CurrentUser = createParamDecorator(
  (
    field: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Authenticated user not found in request',
      );
    }

    if (field) {
      const value = user[field];
      if (value === undefined || value === null || value === '') {
        throw new UnauthorizedException(
          `${String(field)} not found in request user`,
        );
      }

      return value as AuthenticatedUser;
    }

    return user;
  },
);
