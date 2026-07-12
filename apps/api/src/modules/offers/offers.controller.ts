import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  CreateOfferDto,
  CreateOfferGroupDto,
  CreateOfferGroupItemDto,
  PricePreviewDto,
  UpdateOfferDto,
  UpdateOfferGroupDto,
  UpdateOfferGroupItemDto,
} from './dto/offer.dto.js';
import { OffersService } from './offers.service.js';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  async getOffersPaginated(
    @Req() req: Request & { user: { tenantId: string } },
  ) {
    const { tenantId } = req.user;
    const query = req.query as QueryParams;
    return this.offersService.getOffersPaginated(tenantId, query);
  }

  /**
   * Get active offers only (cashier-facing read path).
   * Returns only offers with isActive: true, with full group/item details.
   */
  @Get('active')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  async getActiveOffers(@Req() req: Request & { user: { tenantId: string } }) {
    const { tenantId } = req.user;
    const query = req.query as QueryParams;
    return this.offersService.getActiveOffers(tenantId, query);
  }

  /**
   * Get a single offer with groups and items
   */
  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  async getOffer(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.getOffer(tenantId, id);
  }

  /**
   * Create a new offer
   */
  @Post()
  @Roles('ADMIN', 'MANAGER')
  async createOffer(@Req() req: Request, @Body() body: CreateOfferDto) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.createOffer(tenantId, body);
  }

  /**
   * Update an offer
   */
  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  async updateOffer(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateOfferDto,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.updateOffer(tenantId, id, body);
  }

  /**
   * Delete an offer (cascades groups and items)
   */
  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOffer(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.deleteOffer(tenantId, id);
  }

  // ─── OfferGroup Endpoints ───

  /**
   * Create an offer group
   */
  @Post(':id/groups')
  @Roles('ADMIN', 'MANAGER')
  async createOfferGroup(
    @Req() req: Request,
    @Param('id') offerId: string,
    @Body() body: CreateOfferGroupDto,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.createOfferGroup(tenantId, offerId, body);
  }

  /**
   * Update an offer group
   */
  @Put(':id/groups/:groupId')
  @Roles('ADMIN', 'MANAGER')
  async updateOfferGroup(
    @Req() req: Request,
    @Param('id') offerId: string,
    @Param('groupId') groupId: string,
    @Body() body: UpdateOfferGroupDto,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.updateOfferGroup(
      tenantId,
      offerId,
      groupId,
      body,
    );
  }

  /**
   * Delete an offer group (cascades items)
   */
  @Delete(':id/groups/:groupId')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOfferGroup(
    @Req() req: Request,
    @Param('id') offerId: string,
    @Param('groupId') groupId: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.deleteOfferGroup(tenantId, offerId, groupId);
  }

  // ─── OfferGroupItem Endpoints ───

  /**
   * Add a product to an offer group
   */
  @Post(':id/groups/:groupId/items')
  @Roles('ADMIN', 'MANAGER')
  async addOfferGroupItem(
    @Req() req: Request,
    @Param('id') offerId: string,
    @Param('groupId') groupId: string,
    @Body() body: CreateOfferGroupItemDto,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.addOfferGroupItem(
      tenantId,
      offerId,
      groupId,
      body,
    );
  }

  /**
   * Update extra price of an offer group item
   */
  @Put(':id/groups/:groupId/items/:itemId')
  @Roles('ADMIN', 'MANAGER')
  async updateOfferGroupItem(
    @Req() req: Request,
    @Param('id') offerId: string,
    @Param('groupId') groupId: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateOfferGroupItemDto,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.updateOfferGroupItem(
      tenantId,
      offerId,
      groupId,
      itemId,
      body,
    );
  }

  /**
   * Remove a product from an offer group
   */
  @Delete(':id/groups/:groupId/items/:itemId')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOfferGroupItem(
    @Req() req: Request,
    @Param('id') offerId: string,
    @Param('groupId') groupId: string,
    @Param('itemId') itemId: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.removeOfferGroupItem(
      tenantId,
      offerId,
      groupId,
      itemId,
    );
  }

  @Post('price-preview')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  async pricePreview(@Req() req: Request, @Body() body: PricePreviewDto) {
    const { tenantId } = req.user as { tenantId: string };
    return this.offersService.pricePreview(tenantId, body);
  }
}
