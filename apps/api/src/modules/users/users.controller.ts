import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { UserRole } from '@repo/types';
import { UsersService } from './users.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/:id')
  getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  @Put('/:id')
  updateUserProfile(
    @Param('id') id: string,
    @Body() data: Prisma.UserUpdateInput,
  ) {
    return this.usersService.updateProfile(id, data);
  }

  @Put('/:id/role')
  updateUserRole(@Param('id') id: string, @Body() body: { role: UserRole }) {
    return this.usersService.updateProfile(id, { role: body.role });
  }

  @Put('/:id/change-password')
  changePassword(
    @Param('id') id: string,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(
      id,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Delete('/:id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
