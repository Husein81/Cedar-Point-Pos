import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
} from './dto/modifier-group.dto.js';
import { ModifierGroupsService } from './modifier-groups.service.js';
import { ModifierType } from '@repo/types';

@Controller('modifier-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModifierGroupsController {
  constructor(private readonly modifierGroupsService: ModifierGroupsService) {}

  /**
   * Create a new modifier group
   */
  @Post()
  @Roles('OWNER', 'MANAGER')
  async create(@Req() req: Request, @Body() createDto: CreateModifierGroupDto) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifierGroupsService.create(tenantId, createDto);
  }

  /**
   * Get all modifier groups with optional filters
   */
  @Get()
  @Roles('OWNER', 'MANAGER', 'CASHIER')
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: ModifierType,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifierGroupsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      type,
      includeDeleted: includeDeleted === 'true',
    });
  }

  /**
   * Get modifier groups by type
   */
  @Get('by-type/:type')
  @Roles('OWNER', 'MANAGER', 'CASHIER')
  async findByType(@Req() req: Request, @Param('type') type: ModifierType) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifierGroupsService.findByType(tenantId, type);
  }

  /**
   * Get a specific modifier group
   */
  @Get(':id')
  @Roles('OWNER', 'MANAGER', 'CASHIER')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifierGroupsService.findOne(tenantId, id);
  }

  /**
   * Update a modifier group
   */
  @Put(':id')
  @Roles('OWNER', 'MANAGER')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateDto: UpdateModifierGroupDto,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifierGroupsService.update(tenantId, id, updateDto);
  }

  /**
   * Soft delete a modifier group
   */
  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifierGroupsService.remove(tenantId, id);
  }
}
