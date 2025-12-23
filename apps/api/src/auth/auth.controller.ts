import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import type { CreateUserDto, LoginDto } from './dto/create-user.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Req() request: Request) {
    const body = request.body as CreateUserDto;

    return this.authService.createUser(body);
  }

  @Public()
  @Post('admin-sign-in')
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
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
  logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return { message: 'No token provided' };
    }

    return this.authService.logout(token);
  }
}
