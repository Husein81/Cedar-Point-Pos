import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { LoyaltyService } from './loyalty.service.js';
import { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto.js';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto.js';
import { LoyaltyTransactionQueryDto } from './dto/list-loyalty-transactions.dto.js';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // ──────── helpers ────────

  private getTenantId(req: Request): string {
    const user = req.user as { tenantId?: string };
    if (!user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return user.tenantId;
  }

  private getActor(req: Request): {
    tenantId: string;
    userId: string;
    role: UserRole;
  } {
    const user = req.user as {
      tenantId?: string;
      id?: string;
      role?: UserRole;
    };
    if (!user?.tenantId || !user?.id || !user?.role) {
      throw new BadRequestException('Full user context is required');
    }
    return { tenantId: user.tenantId, userId: user.id, role: user.role };
  }

  // ──────────────────────────────────────────────
  //  1) GET /loyalty/program
  // ──────────────────────────────────────────────

  @Get('program')
  getProgram(@Req() req: Request) {
    const tenantId = this.getTenantId(req);
    return this.loyaltyService.getProgram(tenantId);
  }

  // ──────────────────────────────────────────────
  //  2) PUT /loyalty/program
  // ──────────────────────────────────────────────

  @Put('program')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateProgram(@Req() req: Request, @Body() body: UpdateLoyaltyProgramDto) {
    const tenantId = this.getTenantId(req);
    return this.loyaltyService.updateProgram(tenantId, body);
  }

  // ──────────────────────────────────────────────
  //  3) GET /loyalty/customers/:customerId/account
  // ──────────────────────────────────────────────

  @Get('customers/:customerId/account')
  getAccount(@Req() req: Request, @Param('customerId') customerId: string) {
    const tenantId = this.getTenantId(req);
    return this.loyaltyService.getAccount(tenantId, customerId);
  }

  // ──────────────────────────────────────────────
  //  4) GET /loyalty/customers/:customerId/transactions
  // ──────────────────────────────────────────────

  @Get('customers/:customerId/transactions')
  listTransactions(
    @Req() req: Request,
    @Param('customerId') customerId: string,
    @Query() query: LoyaltyTransactionQueryDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.loyaltyService.listTransactions(tenantId, customerId, query);
  }

  // ──────────────────────────────────────────────
  //  5) POST /loyalty/customers/:customerId/adjustments
  // ──────────────────────────────────────────────

  @Post('customers/:customerId/adjustments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  manualAdjustment(
    @Req() req: Request,
    @Param('customerId') customerId: string,
    @Body() body: ManualAdjustmentDto,
  ) {
    const actor = this.getActor(req);
    return this.loyaltyService.manualAdjustment(
      actor.tenantId,
      customerId,
      body,
      actor.userId,
      actor.role,
    );
  }
}
