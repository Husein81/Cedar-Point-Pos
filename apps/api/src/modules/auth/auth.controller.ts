import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { CreateUserDto, LoginDto } from './dto/user.dto.js';
import type { AdminLoginDto } from './dto/admin-login.dto.js';
import { PinLoginDto } from './dto/pin-login.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client.js';
import type { User as PrismaUser } from '../../generated/prisma/client.js';
import { AuthGuard } from '@nestjs/passport';
import type { User } from '@repo/types';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('admin-sign-in')
  @HttpCode(HttpStatus.OK)
  adminLogin(
    @Body() adminLoginDto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.adminLogin(adminLoginDto, res);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POS terminal PIN login. Public at the JWT layer (the terminal supplies a
   * known staffId from its cached roster); tightly throttled to deter PIN
   * brute force. The tenant is derived from the staff record server-side.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('pin-login')
  @HttpCode(HttpStatus.OK)
  pinLogin(@Body() body: PinLoginDto) {
    return this.authService.pinLogin(body);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.replace('Bearer ', '');
    const cookieToken =
      typeof req.cookies?.sa_token === 'string'
        ? req.cookies.sa_token
        : undefined;

    const token = headerToken || cookieToken;

    // Always clear cookie (even if token missing)
    res.clearCookie('sa_token');

    if (!token) {
      return { message: 'No token provided' };
    }

    return this.authService.logout(token);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request) {
    // `refreshToken` is the RAW token attached by JwtRefreshStrategy.validate(),
    // the single source of truth for which token was presented.
    const { id, refreshToken } = req.user as User;
    return this.authService.refreshTokens(id, String(refreshToken));
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  getProfile(@Req() req: Request) {
    // req.user is the full Prisma row (incl. password/pinHash/refreshToken);
    // project it so secrets never reach the client.
    return this.authService.toPublicUser(req.user as PrismaUser);
  }
}
