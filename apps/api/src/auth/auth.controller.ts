import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import type { CreateUserDto, LoginDto } from './dto/create-user.dto.js';
import type { AdminLoginDto } from './dto/admin-login.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Req() request: Request) {
    const body = request.body as CreateUserDto;

    return this.authService.createUser(body);
  }

  @Public()
  @Post('admin-sign-in')
  @HttpCode(HttpStatus.OK)
  adminLogin(
    @Body() adminLoginDto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.adminLogin(adminLoginDto, res);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
}
