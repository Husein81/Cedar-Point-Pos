import { Body, Controller, Post, Req } from '@nestjs/common';
import { UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { CreateRefundDto } from './dto/create-refund.dto.js';
import { RefundsService } from './refunds.service.js';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  createRefund(@Req() req: Request, @Body() createRefundDto: CreateRefundDto) {
    const user = req.user as { id: string; tenantId: string };
    return this.refundsService.createRefund(
      user.tenantId,
      user.id,
      createRefundDto,
    );
  }
}
