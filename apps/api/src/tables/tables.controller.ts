import { Controller, Delete, Get, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { TablesService } from './tables.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('/branch/:id')
  getTablesByBranch(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Branch ID is required');
    }
    return this.tablesService.getTablesByBranch(id);
  }

  @Get('/:id')
  getTableById(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Table ID is required');
    }
    return this.tablesService.getTableById(id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  createTable(@Req() req: Request) {
    const body = req.body as Prisma.TableCreateInput;
    return this.tablesService.createTable(body);
  }

  @Roles('OWNER', 'MANAGER')
  @Put('/:id')
  updateTable(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Table ID is required');
    }
    const body = req.body as Prisma.TableUpdateInput;
    return this.tablesService.updateTable(id, body);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete('/:id')
  deleteTable(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Table ID is required');
    }
    return this.tablesService.deleteTable(id);
  }
}
