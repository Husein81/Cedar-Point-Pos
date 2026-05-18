import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateOfferDto,
  CreateOfferGroupDto,
  CreateOfferGroupItemDto,
  PricePreviewDto,
  UpdateOfferDto,
  UpdateOfferGroupDto,
  UpdateOfferGroupItemDto,
} from './dto/offer.dto.js';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private handlePrismaError(error: unknown, context: string): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          const target =
            (error.meta?.target as string[])?.join(', ') || 'field';
          throw new ConflictException(`Duplicate value for ${target}`);
        }
        case 'P2025':
          throw new NotFoundException(`Record not found in ${context}`);
        case 'P2003': {
          const field = (error.meta?.field_name as string) || 'reference';
          throw new BadRequestException(`Invalid reference: ${field}`);
        }
        default:
          break;
      }
    }

    this.logger.error(`${context}: ${error}`);
    throw new InternalServerErrorException(`Failed to ${context}`);
  }

  private round(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  async getOffersPaginated(tenantId: string, params: QueryParams) {
    try {
      const { search, sort, order, page: rawPage, limit: rawLimit } = params;

      const page = Math.max(Number(rawPage) || 1, 1);
      const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      const where: Prisma.OfferWhereInput = { tenantId };

      const searchTerm = search?.trim();
      if (searchTerm) {
        where.name = {
          contains: searchTerm,
          mode: Prisma.QueryMode.insensitive,
        };
      }

      const sortableFields: Record<string, true> = {
        name: true,
        basePrice: true,
        createdAt: true,
        updatedAt: true,
      };

      const sortField = sort && sortableFields[sort] ? sort : 'createdAt';
      const sortOrder: Prisma.SortOrder =
        order === 'asc' || order === 'desc' ? order : 'desc';

      const orderBy: Prisma.OfferOrderByWithRelationInput[] = [
        { [sortField]: sortOrder },
        { id: 'desc' },
      ];

      const [totalCount, data] = await this.prisma.$transaction([
        this.prisma.offer.count({ where }),
        this.prisma.offer.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: { offerGroups: true },
            },
            offerGroups: {
              include: {
                offerGroupItems: {
                  include: {
                    product: {
                      select: { id: true, name: true, price: true },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      this.handlePrismaError(error, 'fetch paginated offers');
    }
  }

  async getActiveOffers(tenantId: string, params: QueryParams) {
    try {
      const { search, sort, order, page: rawPage, limit: rawLimit } = params;

      const page = Math.max(Number(rawPage) || 1, 1);
      const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      const where: Prisma.OfferWhereInput = { tenantId, isActive: true };

      const searchTerm = search?.trim();
      if (searchTerm) {
        where.name = {
          contains: searchTerm,
          mode: Prisma.QueryMode.insensitive,
        };
      }

      const sortableFields: Record<string, true> = {
        name: true,
        basePrice: true,
        createdAt: true,
        updatedAt: true,
      };

      const sortField = sort && sortableFields[sort] ? sort : 'name';
      const sortOrder: Prisma.SortOrder =
        order === 'asc' || order === 'desc' ? order : 'asc';

      const orderBy: Prisma.OfferOrderByWithRelationInput[] = [
        { [sortField]: sortOrder },
        { id: 'desc' },
      ];

      const [totalCount, data] = await this.prisma.$transaction([
        this.prisma.offer.count({ where }),
        this.prisma.offer.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            offerGroups: {
              include: {
                offerGroupItems: {
                  include: {
                    product: {
                      select: { id: true, name: true, price: true },
                    },
                  },
                },
              },
            },
            _count: {
              select: { offerGroups: true },
            },
          },
        }),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      this.handlePrismaError(error, 'fetch active offers');
    }
  }

  async getOffer(tenantId: string, offerId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, tenantId },
      include: {
        offerGroups: {
          include: {
            offerGroupItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { offerGroups: true },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  async createOffer(tenantId: string, data: CreateOfferDto) {
    try {
      return await this.prisma.offer.create({
        data: {
          tenantId,
          name: data.name,
          basePrice: data.basePrice,
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'create offer');
    }
  }

  async updateOffer(tenantId: string, offerId: string, data: UpdateOfferDto) {
    try {
      const result = await this.prisma.offer.updateMany({
        where: { id: offerId, tenantId },
        data,
      });

      if (result.count === 0) {
        throw new NotFoundException('Offer not found');
      }

      return await this.prisma.offer.findUnique({ where: { id: offerId } });
    } catch (error) {
      this.handlePrismaError(error, 'update offer');
    }
  }

  async deleteOffer(tenantId: string, offerId: string) {
    try {
      const result = await this.prisma.offer.deleteMany({
        where: { id: offerId, tenantId },
      });

      if (result.count === 0) {
        throw new NotFoundException('Offer not found');
      }

      return result;
    } catch (error) {
      this.handlePrismaError(error, 'delete offer');
    }
  }

  // ─── OfferGroup CRUD ───

  async createOfferGroup(
    tenantId: string,
    offerId: string,
    data: CreateOfferGroupDto,
  ) {
    try {
      // Verify offer belongs to tenant
      const offer = await this.prisma.offer.findFirst({
        where: { id: offerId, tenantId },
      });

      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      if (data.freeItemsCount > data.maxItemsCount) {
        throw new BadRequestException(
          `freeItemsCount (${data.freeItemsCount}) cannot exceed maxItemsCount (${data.maxItemsCount})`,
        );
      }

      return await this.prisma.offerGroup.create({
        data: {
          offerId,
          name: data.name,
          freeItemsCount: data.freeItemsCount,
          maxItemsCount: data.maxItemsCount,
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'create offer group');
    }
  }

  async updateOfferGroup(
    tenantId: string,
    offerId: string,
    groupId: string,
    data: UpdateOfferGroupDto,
  ) {
    try {
      // If freeItemsCount or maxItemsCount is being updated, enforce invariant
      if (
        data.freeItemsCount !== undefined ||
        data.maxItemsCount !== undefined
      ) {
        const group = await this.prisma.offerGroup.findFirst({
          where: {
            id: groupId,
            offer: { id: offerId, tenantId },
          },
          include: {
            _count: { select: { offerGroupItems: true } },
          },
        });

        if (!group) {
          throw new NotFoundException('Offer group not found');
        }

        const newFreeItemsCount = data.freeItemsCount ?? group.freeItemsCount;
        const newMaxItemsCount = data.maxItemsCount ?? group.maxItemsCount;

        if (newFreeItemsCount > group._count.offerGroupItems) {
          throw new BadRequestException(
            `freeItemsCount (${newFreeItemsCount}) cannot exceed the number of items in the group (${group._count.offerGroupItems})`,
          );
        }

        if (newFreeItemsCount > newMaxItemsCount) {
          throw new BadRequestException(
            `freeItemsCount (${newFreeItemsCount}) cannot exceed maxItemsCount (${newMaxItemsCount})`,
          );
        }
      }

      const result = await this.prisma.offerGroup.updateMany({
        where: {
          id: groupId,
          offer: { id: offerId, tenantId },
        },
        data,
      });

      if (result.count === 0) {
        throw new NotFoundException('Offer group not found');
      }

      return await this.prisma.offerGroup.findUnique({
        where: { id: groupId },
      });
    } catch (error) {
      this.handlePrismaError(error, 'update offer group');
    }
  }

  async deleteOfferGroup(tenantId: string, offerId: string, groupId: string) {
    try {
      const result = await this.prisma.offerGroup.deleteMany({
        where: {
          id: groupId,
          offer: { id: offerId, tenantId },
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Offer group not found');
      }

      return result;
    } catch (error) {
      this.handlePrismaError(error, 'delete offer group');
    }
  }

  // ─── OfferGroupItem CRUD ───

  async addOfferGroupItem(
    tenantId: string,
    offerId: string,
    groupId: string,
    data: CreateOfferGroupItemDto,
  ) {
    try {
      // Verify offer belongs to tenant
      const offer = await this.prisma.offer.findFirst({
        where: { id: offerId, tenantId },
      });

      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      // Verify group belongs to offer
      const group = await this.prisma.offerGroup.findFirst({
        where: { id: groupId, offerId },
      });

      if (!group) {
        throw new NotFoundException('Offer group not found');
      }

      // Validate product: must belong to same tenant, be active, not deleted
      const product = await this.prisma.product.findFirst({
        where: { id: data.productId },
        select: {
          id: true,
          tenantId: true,
          isActive: true,
          deletedAt: true,
          name: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.tenantId !== tenantId) {
        throw new BadRequestException('Product does not belong to this tenant');
      }

      if (product.deletedAt) {
        throw new BadRequestException(
          `Product "${product.name}" has been deleted`,
        );
      }

      if (!product.isActive) {
        throw new BadRequestException(`Product "${product.name}" is inactive`);
      }

      // Check for duplicate product in group
      const existing = await this.prisma.offerGroupItem.findUnique({
        where: {
          offerGroupId_productId: {
            offerGroupId: groupId,
            productId: data.productId,
          },
        },
      });

      if (existing) {
        throw new ConflictException('This product is already in the group');
      }

      return await this.prisma.offerGroupItem.create({
        data: {
          offerGroupId: groupId,
          productId: data.productId,
          extraPrice: data.extraPrice,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'add offer group item');
    }
  }

  async updateOfferGroupItem(
    tenantId: string,
    offerId: string,
    groupId: string,
    itemId: string,
    data: UpdateOfferGroupItemDto,
  ) {
    try {
      const result = await this.prisma.offerGroupItem.updateMany({
        where: {
          id: itemId,
          offerGroup: {
            id: groupId,
            offer: { id: offerId, tenantId },
          },
        },
        data: { extraPrice: data.extraPrice },
      });

      if (result.count === 0) {
        throw new NotFoundException('Offer group item not found');
      }

      return await this.prisma.offerGroupItem.findUnique({
        where: { id: itemId },
        include: {
          product: {
            select: { id: true, name: true, price: true },
          },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'update offer group item');
    }
  }

  async removeOfferGroupItem(
    tenantId: string,
    offerId: string,
    groupId: string,
    itemId: string,
  ) {
    try {
      const result = await this.prisma.offerGroupItem.deleteMany({
        where: {
          id: itemId,
          offerGroup: {
            id: groupId,
            offer: { id: offerId, tenantId },
          },
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Offer group item not found');
      }

      // Clamp freeItemsCount if it now exceeds remaining item count
      const group = await this.prisma.offerGroup.findUnique({
        where: { id: groupId },
        include: {
          _count: { select: { offerGroupItems: true } },
        },
      });

      if (group && group.freeItemsCount > group._count.offerGroupItems) {
        await this.prisma.offerGroup.update({
          where: { id: groupId },
          data: { freeItemsCount: group._count.offerGroupItems },
        });
      }

      return result;
    } catch (error) {
      this.handlePrismaError(error, 'remove offer group item');
    }
  }

  // ─── Price Preview & Validation ───

  /**
   * Computes a deterministic pricing breakdown for an offer selection.
   *
   * Pricing rule:
   * - basePrice is the flat fee for the entire offer
   * - Each group has items with optional extraPrice (surcharge above base)
   * - freeItemsCount per group: waives extraPrice on that many items,
   *   applying the discount to the HIGHEST-priced extras first (customer-favorable)
   * - finalTotal = basePrice + Σ(all extras) - Σ(free item discounts)
   *
   * Also returns validation errors (missing groups, invalid products, inactive offer)
   * so callers can use this as both pricing and validation in one call.
   */
  async pricePreview(tenantId: string, dto: PricePreviewDto) {
    const validationErrors: string[] = [];

    // Load full offer with groups and items
    const offer = await this.prisma.offer.findFirst({
      where: { id: dto.offerId, tenantId },
      include: {
        offerGroups: {
          include: {
            offerGroupItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    isActive: true,
                    deletedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (!offer.isActive) {
      validationErrors.push('Offer is currently inactive');
    }

    const basePrice = this.round(Number(offer.basePrice));

    // Build a map of groupId -> selected productIds for quick lookup
    const selectionsByGroup = new Map<string, string[]>();
    for (const sel of dto.selections) {
      const existing = selectionsByGroup.get(sel.groupId) || [];
      existing.push(sel.productId);
      selectionsByGroup.set(sel.groupId, existing);
    }

    // Validate: every group in the offer must have at least one selection
    // and cannot exceed maxItemsCount
    for (const group of offer.offerGroups) {
      const selectedProductIds = selectionsByGroup.get(group.id) || [];
      if (selectedProductIds.length === 0) {
        validationErrors.push(
          `Missing selection for group "${group.name}" (${group.id})`,
        );
      }
      if (selectedProductIds.length > group.maxItemsCount) {
        validationErrors.push(
          `Too many selections for group "${group.name}". Max allowed is ${group.maxItemsCount}.`,
        );
      }
    }

    // Validate: no selections for non-existent groups
    for (const groupId of selectionsByGroup.keys()) {
      if (!offer.offerGroups.some((g) => g.id === groupId)) {
        validationErrors.push(
          `Selection references non-existent group (${groupId})`,
        );
      }
    }

    let totalExtras = 0;
    let totalFreeDiscount = 0;

    const groups: Array<{
      groupId: string;
      groupName: string;
      freeItemsCount: number;
      items: Array<{
        productId: string;
        productName: string;
        retailPrice: number;
        extraPrice: number;
        isFree: boolean;
      }>;
      groupExtras: number;
      freeDiscount: number;
    }> = [];

    for (const group of offer.offerGroups) {
      const selectedProductIds = selectionsByGroup.get(group.id) || [];
      const groupItems: Array<{
        productId: string;
        productName: string;
        retailPrice: number;
        extraPrice: number;
        isFree: boolean;
      }> = [];

      // Map available items in this group by productId
      const availableItemMap = new Map(
        group.offerGroupItems.map((item) => [item.productId, item]),
      );

      for (const productId of selectedProductIds) {
        const offerItem = availableItemMap.get(productId);
        if (!offerItem) {
          validationErrors.push(
            `Product ${productId} is not available in group "${group.name}"`,
          );
          continue;
        }

        if (offerItem.product.deletedAt) {
          validationErrors.push(
            `Product "${offerItem.product.name}" has been deleted`,
          );
          continue;
        }

        if (!offerItem.product.isActive) {
          validationErrors.push(
            `Product "${offerItem.product.name}" is inactive`,
          );
          continue;
        }

        groupItems.push({
          productId,
          productName: offerItem.product.name,
          retailPrice: Number(offerItem.product.price),
          extraPrice: this.round(Number(offerItem.extraPrice)),
          isFree: false, // will be set below
        });
      }

      // Apply free item discount: highest-priced extras first (customer-favorable)
      // Sort descending by extraPrice to discount the most expensive first
      const sortedByExtra = [...groupItems].sort(
        (a, b) => b.extraPrice - a.extraPrice,
      );

      let freeRemaining = group.freeItemsCount;
      let groupFreeDiscount = 0;

      for (const item of sortedByExtra) {
        if (freeRemaining <= 0) break;
        if (item.extraPrice > 0) {
          item.isFree = true;
          groupFreeDiscount += item.extraPrice;
          // Also mark the original array item
          const original = groupItems.find(
            (gi) => gi.productId === item.productId,
          );
          if (original) original.isFree = true;
        }
        freeRemaining--;
      }

      groupFreeDiscount = this.round(groupFreeDiscount);

      const groupExtras = this.round(
        groupItems.reduce((sum, item) => sum + item.extraPrice, 0),
      );

      totalExtras += groupExtras;
      totalFreeDiscount += groupFreeDiscount;

      groups.push({
        groupId: group.id,
        groupName: group.name,
        freeItemsCount: group.freeItemsCount,
        items: groupItems,
        groupExtras,
        freeDiscount: groupFreeDiscount,
      });
    }

    totalExtras = this.round(totalExtras);
    totalFreeDiscount = this.round(totalFreeDiscount);
    const finalTotal = this.round(basePrice + totalExtras - totalFreeDiscount);

    return {
      offerId: offer.id,
      offerName: offer.name,
      isActive: offer.isActive,
      basePrice,
      groups,
      totalExtras,
      totalFreeDiscount,
      finalTotal,
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }
}
