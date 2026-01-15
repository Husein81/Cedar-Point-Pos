import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@repo/types';
import type { Request } from 'express';
import { ReceiptsService } from './receipts.service.js';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  /**
   * Get receipt data for an order
   *
   * Returns all data needed to render a receipt.
   * Pass ?isReprint=true when reprinting an already-printed receipt.
   */
  @Get(':orderId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getReceiptData(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Query('isReprint') isReprint?: string,
  ) {
    const user = req.user as { tenantId: string };

    return this.receiptsService.getReceiptData(
      user.tenantId,
      orderId,
      isReprint === 'true',
    );
  }

  /**
   * Check if a receipt can be printed for an order
   */
  @Get(':orderId/can-print')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async canPrintReceipt(
    @Req() req: Request,
    @Param('orderId') orderId: string,
  ) {
    const user = req.user as { tenantId: string };

    const canPrint = await this.receiptsService.canPrintReceipt(
      user.tenantId,
      orderId,
    );

    return { canPrint };
  }
}
