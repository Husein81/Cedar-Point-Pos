import { Controller, Delete, Get, Put, Req } from '@nestjs/common';
import { Prisma, UserRole } from '@repo/db';
import type { Request } from 'express';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/:id')
  getUserProfile(@Req() req: Request) {
    const { id } = req.params;

    if (!id) {
      throw new Error('User ID is required');
    }

    return this.usersService.getUserProfile(id);
  }

  @Put('/:id')
  updateUserProfile(@Req() req: Request) {
    const { id } = req.params;
    const data = req.body as Prisma.UserUpdateInput;
    if (!id) {
      throw new Error('User ID is required');
    }
    return this.usersService.updateProfile(id, data);
  }

  @Put('/:id/role')
  updateUserRole(@Req() req: Request) {
    const { id } = req.params;
    const { role } = req.body as { role: UserRole };
    if (!id) {
      throw new Error('User ID is required');
    }
    return this.usersService.updateProfile(id, { role });
  }

  @Put('/:id/change-password')
  changePassword(@Req() req: Request) {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body as {
      oldPassword: string;
      newPassword: string;
    };

    if (!id) {
      throw new Error('User ID is required');
    }
    return this.usersService.changePassword(id, oldPassword, newPassword);
  }

  @Delete('/:id')
  deleteUser(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('User ID is required');
    }
    return this.usersService.deleteUser(id);
  }
}
