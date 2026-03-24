import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { ColorService } from './color.service.js';
import type { CreateColorDto, UpdateColorDto } from './dto/color.dto.js';

@Controller('colors')
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  @Get()
  getColors(@CurrentTenant() tenantId: string) {
    return this.colorService.getColors(tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createColor(@CurrentTenant() tenantId: string, @Body() data: CreateColorDto) {
    return this.colorService.createColor({
      ...data,
      tenantId,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateColor(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() data: UpdateColorDto,
  ) {
    return this.colorService.updateColor({
      ...data,
      id,
      tenantId,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteColor(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.colorService.deleteColor(tenantId, id);
  }
}
