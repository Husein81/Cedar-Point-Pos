import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { QueryParams, TransferStatus, UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { CreateTransferDto } from './dto/create-transfer.dto.js';
import type { UpdateTransferDto } from './dto/update-transfer.dto.js';
import { TransfersService } from './transfers.service.js';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  /**
   * Create a new transfer request
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Req() req: Request, @Body() createTransferDto: CreateTransferDto) {
    const user = req.user as { tenantId: string; id: string };
    return this.transfersService.create(
      user.tenantId,
      user.id,
      createTransferDto,
    );
  }

  /**
   * Get all transfers with optional filters
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Req() req: Request) {
    const user = req.user as { tenantId: string };
    const query = req.query as QueryParams & {
      page?: string;
      limit?: string;
      status?: TransferStatus;
      fromBranchId?: string;
      toBranchId?: string;
    };

    return this.transfersService.findAll(user.tenantId, query);
  }

  /**
   * Get a specific transfer by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.transfersService.findOne(user.tenantId, id);
  }

  /**
   * Complete a transfer (moves inventory atomically)
   */
  @Post(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  complete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string; id: string };
    return this.transfersService.completeTransfer(user.tenantId, user.id, id);
  }

  /**
   * Cancel a pending transfer
   */
  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  cancel(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.transfersService.cancelTransfer(user.tenantId, id);
  }

  /**
   * Update transfer (status or notes)
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateTransferDto: UpdateTransferDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.transfersService.update(user.tenantId, id, updateTransferDto);
  }
}
