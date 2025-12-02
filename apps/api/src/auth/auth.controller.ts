import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request } from 'express';
import { Prisma } from '@repo/db';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @Body() createUserDto: Prisma.UserCreateInput & { tenantId: string },
  ) {
    return this.authService.createUser(createUserDto);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: Prisma.UserCreateInput) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
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
