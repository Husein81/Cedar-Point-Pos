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
  CreateModifierDto,
  UpdateModifierDto,
} from './dto/modifier.dto.js';
import { ModifiersService } from './modifiers.service.js';

@Controller('modifier-groups/:groupId/modifiers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  /**
   * Create a new modifier in a group
   */
  @Post()
  @Roles('OWNER', 'MANAGER')
  async create(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() createDto: CreateModifierDto,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifiersService.create(tenantId, groupId, createDto);
  }

  /**
   * Bulk create modifiers for a group
   */
  @Post('bulk')
  @Roles('OWNER', 'MANAGER')
  async bulkCreate(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() modifiers: CreateModifierDto[],
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifiersService.bulkCreate(tenantId, groupId, modifiers);
  }

  /**
   * Get all modifiers in a group
   */
  @Get()
  @Roles('OWNER', 'MANAGER', 'CASHIER')
  async findAll(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifiersService.findAllInGroup(tenantId, groupId, {
      includeDeleted: includeDeleted === 'true',
    });
  }

  /**
   * Get a specific modifier
   */
  @Get(':id')
  @Roles('OWNER', 'MANAGER', 'CASHIER')
  async findOne(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifiersService.findOne(tenantId, groupId, id);
  }

  /**
   * Update a modifier
   */
  @Put(':id')
  @Roles('OWNER', 'MANAGER')
  async update(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateModifierDto,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifiersService.update(tenantId, groupId, id, updateDto);
  }

  /**
   * Soft delete a modifier
   */
  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.modifiersService.remove(tenantId, groupId, id);
  }
}
