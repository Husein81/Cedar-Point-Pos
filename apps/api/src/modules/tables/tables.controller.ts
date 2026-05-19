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
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CreateTableDto,
  type UpdateTableDto,
  type UpdateTableStatusDto,
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

  @Roles('ADMIN', 'MANAGER')
  @Post()
  createTable(@Body() body: CreateTableDto, @CurrentTenant() tenantId: string) {
    return this.tablesService.createTable(body, tenantId);
  }

  @Roles('ADMIN', 'MANAGER')
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

  @Roles('ADMIN', 'MANAGER')
  @Delete('/:id')
  deleteTable(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.tablesService.deleteTable(id, tenantId);
  }
}
