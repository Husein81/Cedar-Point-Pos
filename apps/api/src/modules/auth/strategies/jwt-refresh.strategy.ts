import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null =>
          typeof req.cookies?.sa_refresh_token === 'string'
            ? req.cookies.sa_refresh_token
            : null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken =
      req.headers.authorization?.replace('Bearer ', '') ||
      (typeof req.cookies?.sa_refresh_token === 'string'
        ? req.cookies.sa_refresh_token
        : undefined);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const user = await this.authService.validateUser(payload);
    // Hand the raw refresh token to the route handler via req.user so the
    // controller has a single source of truth and never re-extracts it from a
    // possibly-different request location than this strategy used.
    return { ...user, refreshToken };
  }
}
