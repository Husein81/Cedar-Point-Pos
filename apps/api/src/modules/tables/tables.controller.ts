import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { TablesService } from './tables.service.js';
import {
  createTableDto,
  updateTableDto,
  updateTableStatusDto,
} from './dto/tables.dto.js';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  /**
   * Get all tables for a branch
   */
  @Get('/branch/:branchId')
  getTablesByBranch(
    @Param('branchId') branchId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.getTablesByBranch(branchId, tenantId);
  }

  /**
   * Get all tables for a floor
   */
  @Get('/floor/:floorId')
  getTablesByFloor(
    @Param('floorId') floorId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.getTablesByFloor(floorId, tenantId);
  }

  /**
   * Get table statistics for a branch
   */
  @Get('/branch/:branchId/stats')
  getTableStats(
    @Param('branchId') branchId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.getTableStats(branchId, tenantId);
  }

  /**
   * Get a specific table by ID
   */
  @Get('/:id')
  getTableById(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.tablesService.getTableById(id, tenantId);
  }

  @Get('/:id/active-orders')
  getActiveOrdersByTable(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.getActiveOrdersByTable(id, tenantId);
  }

  /**
   * Create a new table (Admin/Manager only)
   */
  @Roles('ADMIN', 'MANAGER')
  @Post()
  createTable(@Body() body: any, @CurrentTenant() tenantId: string) {
    const parseResult = createTableDto.safeParse(body);

    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((i) => i.message).join(', '),
      );
    }

    return this.tablesService.createTable(parseResult.data, tenantId);
  }

  /**
   * Update a table (Admin/Manager only)
   */
  @Roles('ADMIN', 'MANAGER')
  @Put('/:id')
  updateTable(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentTenant() tenantId: string,
  ) {
    const parseResult = updateTableDto.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((i) => i.message).join(', '),
      );
    }

    return this.tablesService.updateTable(id, parseResult.data, tenantId);
  }

  /**
   * Update table status (AVAILABLE, OCCUPIED, RESERVED)
   * Any authenticated user can change status (for POS operations)
   */
  @Patch('/:id/status')
  updateTableStatus(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentTenant() tenantId: string,
  ) {
    const parseResult = updateTableStatusDto.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((i) => i.message).join(', '),
      );
    }

    return this.tablesService.updateTableStatus(id, parseResult.data, tenantId);
  }

  /**
   * Soft delete a table (Admin/Manager only)
   */
  @Roles('ADMIN', 'MANAGER')
  @Delete('/:id')
  deleteTable(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.tablesService.deleteTable(id, tenantId);
  }
}
