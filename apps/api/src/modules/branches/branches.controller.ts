import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@repo/types';
import { Roles } from '../common/decorators/roles.decorator.js';
import { BranchesService } from './branches.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { Prisma } from '../../generated/prisma/client.js';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}
  @Get()
  getBranches(@Req() req: Request) {
    const { tenantId } = req.user as { tenantId: string };
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.branchesService.getBranchesByTenantId(tenantId);
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('/tenant/:tenantId')
  createBranch(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateBranchDto,
  ) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.branchesService.createBranch(tenantId, body);
  }

  @Roles(UserRole.SYSTEM_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @Post('/:id')
  updateBranch(@Req() req: Request, @Param('id') id: string) {
    if (!id) {
      throw new Error('Branch ID is required');
    }
    const body = req.body as Prisma.BranchUpdateInput;
    return this.branchesService.updateBranch(id, body);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete('/:id')
  deleteBranch(@Req() req: Request, @Param('id') id: string) {
    if (!id) {
      throw new Error('Branch ID is required');
    }
    return this.branchesService.deleteBranch(id);
  }

  @Get('/:id')
  getBranchById(@Req() req: Request, @Param('id') id: string) {
    if (!id) {
      throw new Error('Branch ID is required');
    }
    return this.branchesService.getBranchById(id);
  }

  @Get('/tenant/:tenantId')
  getBranchesByTenantId(@Param('tenantId') tenantId: string) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.branchesService.getBranchesByTenantId(tenantId);
  }
}
