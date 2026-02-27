import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import type { Request } from 'express';
import { PurchaseOrderStatus } from '../../generated/prisma/client.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreatePurchaseOrderSchema } from './dto/create-purchase-order.dto.js';
import {
  AddPurchaseOrderItemSchema,
  UpdatePurchaseOrderItemSchema,
} from './dto/purchase-order-item.dto.js';
import { UpdatePurchaseOrderSchema } from './dto/update-purchase-order.dto.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

const VALID_PO_STATUSES = new Set(Object.values(PurchaseOrderStatus));

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: Record<string, string>,
  ) {
    if (query.status && !VALID_PO_STATUSES.has(query.status as PurchaseOrderStatus)) {
      throw new BadRequestException(
        `Invalid status filter: ${query.status}. Valid values: ${[...VALID_PO_STATUSES].join(', ')}`,
      );
    }

    return this.purchaseOrdersService.getPurchaseOrdersPaginated(
      tenantId,
      query,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Req() req: Request, @Body() body: unknown) {
    const parseResult = CreatePurchaseOrderSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((issue) => issue.message).join(', '),
      );
    }

    const user = req.user as { tenantId: string; id: string };
    return this.purchaseOrdersService.createPurchaseOrder(
      user.tenantId,
      user.id,
      parseResult.data,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.purchaseOrdersService.getPurchaseOrder(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    const parseResult = UpdatePurchaseOrderSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((issue) => issue.message).join(', '),
      );
    }

    return this.purchaseOrdersService.updatePurchaseOrder(
      tenantId,
      id,
      parseResult.data,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.purchaseOrdersService.deletePurchaseOrder(tenantId, id);
  }

  @Post(':id/order')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  order(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.purchaseOrdersService.orderPurchaseOrder(tenantId, id);
  }

  @Post(':id/receive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  receive(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string; id: string };
    return this.purchaseOrdersService.receivePurchaseOrder(
      user.tenantId,
      user.id,
      id,
    );
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  cancel(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.purchaseOrdersService.cancelPurchaseOrder(tenantId, id);
  }

  @Post(':id/items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  addItem(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    const parseResult = AddPurchaseOrderItemSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((issue) => issue.message).join(', '),
      );
    }

    return this.purchaseOrdersService.addPurchaseOrderItem(
      tenantId,
      id,
      parseResult.data,
    );
  }

  @Patch(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    const parseResult = UpdatePurchaseOrderItemSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.issues.map((issue) => issue.message).join(', '),
      );
    }

    return this.purchaseOrdersService.updatePurchaseOrderItem(
      tenantId,
      id,
      itemId,
      parseResult.data,
    );
  }

  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.purchaseOrdersService.removePurchaseOrderItem(
      tenantId,
      id,
      itemId,
    );
  }
}
