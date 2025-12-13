/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { TransfersService } from './transfers.service';
import type { CreateTransferDto } from './dto/create-transfer.dto';
import type { UpdateTransferDto } from './dto/update-transfer.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { TransferStatus, UserRole } from '@repo/db';
import type { Request } from 'express';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  /**
   * Create a new transfer request
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
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
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TransferStatus,
    @Query('fromBranchId') fromBranchId?: string,
    @Query('toBranchId') toBranchId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.transfersService.findAll(user.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      fromBranchId,
      toBranchId,
    });
  }

  /**
   * Get a specific transfer by ID
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.transfersService.findOne(user.tenantId, id);
  }

  /**
   * Complete a transfer (moves inventory atomically)
   */
  @Post(':id/complete')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  complete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string; id: string };
    return this.transfersService.completeTransfer(user.tenantId, user.id, id);
  }

  /**
   * Cancel a pending transfer
   */
  @Post(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  cancel(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.transfersService.cancelTransfer(user.tenantId, id);
  }

  /**
   * Update transfer (status or notes)
   */
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateTransferDto: UpdateTransferDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.transfersService.update(user.tenantId, id, updateTransferDto);
  }
}
