import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { FloorsService } from './floors.service.js';
import { createFloorDto, updateFloorDto } from '../tables/dto/tables.dto.js';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  /**
   * Get all floors for a branch with table counts
   */
  @Get('/branch/:branchId')
  getFloorsByBranch(
    @CurrentTenant() tenantId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.floorsService.getFloorsByBranch(branchId, tenantId);
  }

  /**
   * Get a specific floor by ID
   */
  @Get('/:id')
  getFloorById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.floorsService.getFloorById(id, tenantId);
  }

  /**
   * Get all tables for a floor
   */
  @Get('/:id/tables')
  getTablesByFloor(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.floorsService.getTablesByFloor(id, tenantId);
  }

  /**
   * Create a new floor (Admin/Manager only)
   */
  @Roles('ADMIN', 'MANAGER')
  @Post()
  createFloor(@CurrentTenant() tenantId: string, @Body() body: unknown) {
    const parseResult = createFloorDto.safeParse(body);

    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((i) => i.message).join(', '),
      );
    }

    return this.floorsService.createFloor(parseResult.data, tenantId);
  }

  /**
   * Update a floor (Admin/Manager only)
   */
  @Roles('ADMIN', 'MANAGER')
  @Put('/:id')
  updateFloor(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parseResult = updateFloorDto.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((i) => i.message).join(', '),
      );
    }

    return this.floorsService.updateFloor(id, parseResult.data, tenantId);
  }

  /**
   * Permanently delete a floor and its tables (Admin/Manager only)
   */
  @Roles('ADMIN', 'MANAGER')
  @Delete('/:id')
  deleteFloor(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.floorsService.deleteFloor(id, tenantId);
  }
}
