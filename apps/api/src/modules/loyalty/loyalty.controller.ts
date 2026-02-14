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
import { updateLoyaltyProgramDto } from './dto/update-loyalty-program.dto.js';
import { manualAdjustmentDto } from './dto/manual-adjustment.dto.js';
import { loyaltyTransactionQueryDto } from './dto/list-loyalty-transactions.dto.js';

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
  updateProgram(@Req() req: Request, @Body() body: unknown) {
    const tenantId = this.getTenantId(req);

    const result = updateLoyaltyProgramDto.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((e) => e.message).join(', '),
      );
    }

    return this.loyaltyService.updateProgram(tenantId, result.data);
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
    @Query() query: Record<string, unknown>,
  ) {
    const tenantId = this.getTenantId(req);

    const parsed = loyaltyTransactionQueryDto.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((e) => e.message).join(', '),
      );
    }

    return this.loyaltyService.listTransactions(
      tenantId,
      customerId,
      parsed.data,
    );
  }

  // ──────────────────────────────────────────────
  //  5) POST /loyalty/customers/:customerId/adjustments
  // ──────────────────────────────────────────────

  @Post('customers/:customerId/adjustments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  manualAdjustment(
    @Req() req: Request,
    @Param('customerId') customerId: string,
    @Body() body: unknown,
  ) {
    const actor = this.getActor(req);

    const parsed = manualAdjustmentDto.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((e) => e.message).join(', '),
      );
    }

    return this.loyaltyService.manualAdjustment(
      actor.tenantId,
      customerId,
      parsed.data,
      actor.userId,
      actor.role,
    );
  }
}
