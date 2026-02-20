import { Roles } from '../common/decorators/roles.decorator.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  OrderStatus,
  OrderType,
  SortOrder,
  UserRole,
  PaymentMethod,
} from '@repo/types';
import type { Request } from 'express';
import { ZodError } from 'zod';

import type { AddItemDto } from './dto/add-item.dto.js';
import type { AssignTableDto } from './dto/assign-table.dto.js';
import type {
  BatchPaymentDto,
  CreateOrderDto,
} from './dto/create-order.dto.js';
import type { UpdateQuantityDto } from './dto/update-quantity.dto.js';
import type { UpdateItemDiscountDto } from './dto/update-item-discount.dto.js';
import { addOfferItemsSchema } from './dto/add-offer-items.dto.js';

import { OrdersService } from './orders.service.js';

/**
 * Parses and validates a request body against a Zod schema.
 * Throws BadRequestException with flattened error details on validation failure.
 */
function validateBody<T>(schema: { parse: (data: unknown) => T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.flatten(),
      });
    }
    throw error;
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order (always starts as DRAFT)
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  create(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const user = req.user as { tenantId: string; id: string };
    return this.ordersService.create(user.tenantId, user.id, dto);
  }

  /* ----------------------------------------------------
     READ
  ---------------------------------------------------- */

  /**
   * Get all orders with filters
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderStatus,
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: OrderType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tableId') tableId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: SortOrder,
  ) {
    const user = req.user as { tenantId: string };

    return this.ordersService.findAll(user.tenantId, {
      page,
      limit,
      status,
      branchId,
      userId,
      type,
      startDate,
      endDate,
      tableId,
      search,
      sort,
      order,
    });
  }

  /**
   * Get active (unpaid) order for a specific table
   * Returns the order if found, null if no active order exists
   */
  @Get('table/:tableId/active')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  findActiveOrderByTable(
    @Req() req: Request,
    @Param('tableId') tableId: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.findActiveOrderByTableId(user.tenantId, tableId);
  }

  /**
   * Get order by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.ordersService.findOne(user.tenantId, id);
  }

  /* ----------------------------------------------------
     ORDER STATE MACHINE
  ---------------------------------------------------- */

  /**
   * Update order status
   *
   * ✅ Single entry point for state machine
   * ✅ Inventory deducted ONLY when status → PAID
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status: OrderStatus },
  ) {
    const user = req.user as { tenantId: string; id: string };

    return this.ordersService.updateStatus(
      user.tenantId,
      id,
      body.status,
      user.id,
    );
  }

  /* ----------------------------------------------------
     PAYMENTS
  ---------------------------------------------------- */
  @Post(':id/payment')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  processPayment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    body: {
      // Batch payments (new format)
      payments?: BatchPaymentDto;
      // Single payment (deprecated, for backwards compatibility)
      amount?: number;
      method?: PaymentMethod;
      currencyCode?: string;
      exchangeRate?: number;
      // Loyalty redemption (optional)
      loyalty?: { redeemPoints: number };
    },
  ) {
    const user = req.user as { tenantId: string; id: string };

    return this.ordersService.processPayment(user.tenantId, id, body, user.id);
  }

  /* ----------------------------------------------------
     ORDER MODIFICATIONS (DRAFT ONLY)
  ---------------------------------------------------- */

  /**
   * Update discount
   */
  @Patch(':id/discount')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  updateDiscount(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { discount: number },
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.updateDiscount(user.tenantId, id, body.discount);
  }
  /**
   * Assign or change table (restaurant only)
   */
  @Patch(':id/table')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  assignTableToOrder(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AssignTableDto,
  ) {
    if (!dto.tableId) {
      throw new BadRequestException('Table ID is required');
    }

    const user = req.user as { tenantId: string };
    return this.ordersService.assignTableToOrder(
      user.tenantId,
      id,
      dto.tableId,
    );
  }

  @Patch(':id/transfer-table')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  transferOrderToTable(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { targetTableId: string; mergeIntoOrderId?: string },
  ) {
    if (!body.targetTableId) {
      throw new BadRequestException('Target table ID is required');
    }

    const user = req.user as { tenantId: string };
    return this.ordersService.transferOrderToTable(
      user.tenantId,
      id,
      body.targetTableId,
      body.mergeIntoOrderId,
    );
  }

  @Post(':id/merge')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  mergeOrders(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { sourceOrderId: string },
  ) {
    if (!body.sourceOrderId) {
      throw new BadRequestException('Source order ID is required');
    }

    const user = req.user as { tenantId: string };
    return this.ordersService.mergeOrders(
      user.tenantId,
      id,
      body.sourceOrderId,
    );
  }

  /**
   * Add item to order
   */
  @Post(':id/items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  addItemToOrder(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.addItemToOrder(user.tenantId, id, dto);
  }

  /**
   * Update item quantity
   */
  @Patch(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  updateItemQuantity(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateQuantityDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.updateItemQuantity(
      user.tenantId,
      id,
      itemId,
      dto.quantity,
    );
  }

  /**
   * Remove item from order
   */
  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  removeItemFromOrder(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.removeItemFromOrder(user.tenantId, id, itemId);
  }

  /**
   * Update item discount
   */
  @Patch(':id/items/:itemId/discount')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  updateItemDiscount(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDiscountDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.updateItemDiscount(
      user.tenantId,
      id,
      itemId,
      dto.value,
      dto.type,
    );
  }

  /* ----------------------------------------------------
     INVENTORY & KITCHEN
  ---------------------------------------------------- */

  /**
   * Preview inventory deductions (NO mutation)
   */
  @Get(':id/preview-deductions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  previewDeductions(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('branchId') branchId: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.previewOrderStockDeductions(
      user.tenantId,
      branchId,
      id,
    );
  }

  /**
   * Send order to kitchen (restaurant flow)
   */
  @Post(':id/send-to-kitchen')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  sendToKitchen(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string; id: string };
    return this.ordersService.sendToKitchen(user.tenantId, id);
  }

  /* ----------------------------------------------------
     OFFER INTEGRATION
  ---------------------------------------------------- */

  /**
   * Add items from an offer to an order.
   * Server computes authoritative pricing — never trusts client totals.
   *
   * POST /orders/:id/items/from-offer
   */
  @Post(':id/items/from-offer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  addOfferItemsToOrder(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const user = req.user as { tenantId: string };
    const data = validateBody(addOfferItemsSchema, body);
    return this.ordersService.addOfferItemsToOrder(user.tenantId, id, data);
  }
}
