import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { User, UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ColorService } from './color.service.js';
import type { CreateColorDto, UpdateColorDto } from './dto/color.dto.js';

@Controller('colors')
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  @Get()
  getColors(@Req() req: Request) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.colorService.getColors(user.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createColor(@Req() req: Request, @Body() data: CreateColorDto) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.colorService.createColor({
      ...data,
      tenantId: user.tenantId,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateColor(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateColorDto,
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.colorService.updateColor({
      ...data,
      id,
      tenantId: user.tenantId,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteColor(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.colorService.deleteColor(user.tenantId, id);
  }

  @Post('seed')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  seedColors(@Req() req: Request) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.colorService.seedColors(user.tenantId);
  }
}
