import { Controller, Post, Body, Req } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import type { CreateRefundDto } from './dto/create-refund.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@repo/db';
import type { Request } from 'express';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  createRefund(@Req() req: Request, @Body() createRefundDto: CreateRefundDto) {
    const user = req.user as { tenantId: string };
    return this.refundsService.createRefund(user.tenantId, createRefundDto);
  }
}
