import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableLayoutDto,
  UpdateTableStatusDto,
} from './dto/tables.dto.js';
import { TablesService } from './tables.service.js';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('/branch/:branchId')
  getTablesByBranch(
    @Param('branchId') branchId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.getTablesByBranch(branchId, tenantId);
  }

  /**
   * Floor-plan overview: tables + lightweight active-order summary per table
   * in a single response. Primary query of the POS Table Management page.
   */
  @Get('/branch/:branchId/overview')
  getTablesOverview(
    @Param('branchId') branchId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.getTablesOverview(branchId, tenantId);
  }

  @Get('/floor/:floorId')
  getTablesByFloor(
    @Param('floorId') floorId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.getTablesByFloor(floorId, tenantId);
  }

  @Get('/branch/:branchId/stats')
  getTableStats(
    @Param('branchId') branchId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.getTableStats(branchId, tenantId);
  }

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

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  createTable(@Body() body: CreateTableDto, @CurrentTenant() tenantId: string) {
    return this.tablesService.createTable(body, tenantId);
  }

  /**
   * Bulk floor-plan geometry save from the Floor Editor (manager mode).
   */
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('/layout')
  updateTableLayout(
    @Body() body: UpdateTableLayoutDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.updateTableLayout(body, tenantId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Put('/:id')
  updateTable(
    @Param('id') id: string,
    @Body() body: UpdateTableDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.updateTable(id, body, tenantId);
  }

  @Patch('/:id/status')
  updateTableStatus(
    @Param('id') id: string,
    @Body() body: UpdateTableStatusDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tablesService.updateTableStatus(id, body, tenantId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete('/:id')
  deleteTable(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.tablesService.deleteTable(id, tenantId);
  }
}
