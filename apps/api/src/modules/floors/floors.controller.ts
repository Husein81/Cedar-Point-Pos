import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Req,
  BadRequestException,
  Param,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { FloorsService } from './floors.service.js';
import { createFloorDto, updateFloorDto } from '../tables/dto/tables.dto.js';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  /**
   * Get all floors for a branch with table counts
   */
  @Get('/branch/:branchId')
  getFloorsByBranch(@Req() req: Request, @Param('branchId') branchId: string) {
    const user = req.user as { tenantId: string };

    if (!branchId) {
      throw new BadRequestException('Branch ID is required');
    }

    return this.floorsService.getFloorsByBranch(branchId, user.tenantId);
  }

  /**
   * Get a specific floor by ID
   */
  @Get('/:id')
  getFloorById(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };

    if (!id) {
      throw new BadRequestException('Floor ID is required');
    }

    return this.floorsService.getFloorById(id, user.tenantId);
  }

  /**
   * Get all tables for a floor
   */
  @Get('/:id/tables')
  getTablesByFloor(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };

    if (!id) {
      throw new BadRequestException('Floor ID is required');
    }

    return this.floorsService.getTablesByFloor(id, user.tenantId);
  }

  /**
   * Create a new floor (Admin/Manager only)
   */
  @Roles('ADMIN', 'MANAGER')
  @Post()
  createFloor(@Req() req: Request) {
    const user = req.user as { tenantId: string };
    const parseResult = createFloorDto.safeParse(req.body);

    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((i) => i.message).join(', '),
      );
    }

    return this.floorsService.createFloor(parseResult.data, user.tenantId);
  }

  /**
   * Update a floor (Admin/Manager only)
   */
  @Roles('ADMIN', 'MANAGER')
  @Put('/:id')
  updateFloor(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };

    if (!id) {
      throw new BadRequestException('Floor ID is required');
    }

    const parseResult = updateFloorDto.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((i) => i.message).join(', '),
      );
    }

    return this.floorsService.updateFloor(id, parseResult.data, user.tenantId);
  }

  /**
   * Soft delete a floor (Admin/Manager only)
   * Tables on this floor will be unassigned
   */
  @Roles('ADMIN', 'MANAGER')
  @Delete('/:id')
  deleteFloor(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };

    if (!id) {
      throw new BadRequestException('Floor ID is required');
    }

    return this.floorsService.deleteFloor(id, user.tenantId);
  }
}
