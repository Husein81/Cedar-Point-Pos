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
  BadRequestException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import type { Request } from 'express';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { OffersService } from './offers.service.js';
import {
  createOfferSchema,
  updateOfferSchema,
  createOfferGroupSchema,
  updateOfferGroupSchema,
  createOfferGroupItemSchema,
  updateOfferGroupItemSchema,
  pricePreviewSchema,
} from './dto/offer.dto.js';

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

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // ─── Offer Endpoints ───

  /**
   * Get paginated list of offers
   */
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
  async getActiveOffers(
    @Req() req: Request & { user: { tenantId: string } },
  ) {
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
  async createOffer(@Req() req: Request, @Body() body: unknown) {
    const { tenantId } = req.user as { tenantId: string };
    const data = validateBody(createOfferSchema, body);
    return this.offersService.createOffer(tenantId, data);
  }

  /**
   * Update an offer
   */
  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  async updateOffer(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    const data = validateBody(updateOfferSchema, body);
    return this.offersService.updateOffer(tenantId, id, data);
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
    @Body() body: unknown,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    const data = validateBody(createOfferGroupSchema, body);
    return this.offersService.createOfferGroup(tenantId, offerId, data);
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
    @Body() body: unknown,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    const data = validateBody(updateOfferGroupSchema, body);
    return this.offersService.updateOfferGroup(
      tenantId,
      offerId,
      groupId,
      data,
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
    @Body() body: unknown,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    const data = validateBody(createOfferGroupItemSchema, body);
    return this.offersService.addOfferGroupItem(
      tenantId,
      offerId,
      groupId,
      data,
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
    @Body() body: unknown,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    const data = validateBody(updateOfferGroupItemSchema, body);
    return this.offersService.updateOfferGroupItem(
      tenantId,
      offerId,
      groupId,
      itemId,
      data,
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

  // ─── Pricing & Validation ───

  /**
   * Compute a deterministic pricing breakdown for an offer selection.
   * Also returns validation errors (missing groups, invalid products, etc.)
   *
   * POST /offers/price-preview
   *
   * Request body:
   * {
   *   "offerId": "clxyz...",
   *   "selections": [
   *     { "groupId": "grp1", "productId": "prod1" },
   *     { "groupId": "grp2", "productId": "prod2" }
   *   ]
   * }
   *
   * Response:
   * {
   *   "offerId": "clxyz...",
   *   "offerName": "Combo Meal",
   *   "isActive": true,
   *   "basePrice": 10.00,
   *   "groups": [...],
   *   "totalExtras": 3.00,
   *   "totalFreeDiscount": 1.50,
   *   "finalTotal": 11.50,
   *   "isValid": true,
   *   "validationErrors": []
   * }
   */
  @Post('price-preview')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  async pricePreview(@Req() req: Request, @Body() body: unknown) {
    const { tenantId } = req.user as { tenantId: string };
    const data = validateBody(pricePreviewSchema, body);
    return this.offersService.pricePreview(tenantId, data);
  }
}
