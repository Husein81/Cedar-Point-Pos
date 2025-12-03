import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';
import { Prisma } from '@repo/db';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @Body() createUserDto: Prisma.UserCreateInput & { tenantId: string },
  ) {
    return this.authService.createUser(createUserDto);
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
