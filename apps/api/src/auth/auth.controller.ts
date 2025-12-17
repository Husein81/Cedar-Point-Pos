import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Req() request: Request) {
    const body = request.body as Prisma.UserCreateInput;

    return this.authService.createUser(body);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: Prisma.UserCreateInput) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return { message: 'No token provided' };
    }

    return this.authService.logout(token);
  }
}
