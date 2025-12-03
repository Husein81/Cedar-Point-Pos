import { Body, Controller, Delete, Get, Post, Req } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { Roles } from '@/common/decorators/roles.decorator';
import type { Request } from 'express';
import { Prisma } from '@repo/db';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}
  @Get()
  getBranches() {
    return this.branchesService.getBranches();
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  createBranch(@Req() req: Request) {
    const body = req.body as Prisma.BranchCreateInput;
    return this.branchesService.createBranch(body);
  }

  @Roles('OWNER', 'MANAGER')
  @Post('/:id')
  updateBranch(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Branch ID is required');
    }
    const body = req.body as Prisma.BranchUpdateInput;
    return this.branchesService.updateBranch(id, body);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete('/:id')
  deleteBranch(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Branch ID is required');
    }
    return this.branchesService.deleteBranch(id);
  }

  @Get('/:id')
  getBranchById(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Branch ID is required');
    }
    return this.branchesService.getBranchById(id);
  }

  @Get('/tenant/:tenantId')
  getBranchesByTenantId(@Req() req: Request) {
    const { tenantId } = req.params;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.branchesService.getBranchesByTenantId(tenantId);
  }
}
