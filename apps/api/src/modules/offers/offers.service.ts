import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateOfferDto,
  UpdateOfferDto,
  CreateOfferGroupDto,
  UpdateOfferGroupDto,
  CreateOfferGroupItemDto,
  UpdateOfferGroupItemDto,
} from './dto/offer.dto.js';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Offer CRUD ───

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
      console.error('Error fetching paginated offers:', error);
      throw new InternalServerErrorException('Failed to fetch offers');
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
      console.error('Error creating offer:', error);
      throw new InternalServerErrorException('Failed to create offer');
    }
  }

  async updateOffer(tenantId: string, offerId: string, data: UpdateOfferDto) {
    try {
      // We use deleteMany style 'where' to ensure tenant separation in one call
      const result = await this.prisma.offer.updateMany({
        where: { id: offerId, tenantId },
        data,
      });

      if (result.count === 0) {
        throw new NotFoundException('Offer not found');
      }

      return await this.prisma.offer.findUnique({ where: { id: offerId } });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error updating offer:', error);
      throw new InternalServerErrorException('Failed to update offer');
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
      if (error instanceof NotFoundException) throw error;
      console.error('Error deleting offer:', error);
      throw new InternalServerErrorException('Failed to delete offer');
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

      return await this.prisma.offerGroup.create({
        data: {
          offerId,
          name: data.name,
          freeItemsCount: data.freeItemsCount,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error creating offer group:', error);
      throw new InternalServerErrorException('Failed to create offer group');
    }
  }

  async updateOfferGroup(
    tenantId: string,
    offerId: string,
    groupId: string,
    data: UpdateOfferGroupDto,
  ) {
    try {
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
      if (error instanceof NotFoundException) throw error;
      console.error('Error updating offer group:', error);
      throw new InternalServerErrorException('Failed to update offer group');
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
      if (error instanceof NotFoundException) throw error;
      console.error('Error deleting offer group:', error);
      throw new InternalServerErrorException('Failed to delete offer group');
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
        throw new BadRequestException('This product is already in the group');
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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error adding offer group item:', error);
      throw new InternalServerErrorException('Failed to add offer group item');
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
      if (error instanceof NotFoundException) throw error;
      console.error('Error updating offer group item:', error);
      throw new InternalServerErrorException(
        'Failed to update offer group item',
      );
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

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error removing offer group item:', error);
      throw new InternalServerErrorException(
        'Failed to remove offer group item',
      );
    }
  }
}
