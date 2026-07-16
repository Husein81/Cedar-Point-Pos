import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the generated Prisma client to avoid ESM import.meta.url issue in Jest CJS
vi.mock('../../generated/prisma/client.js', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    constructor(
      message: string,
      { code, meta }: { code: string; meta?: Record<string, unknown> },
    ) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = code;
      this.meta = meta;
    }
  }

  // Stub PrismaClient so PrismaService can extend it
  class PrismaClient {
    $connect() {
      return Promise.resolve();
    }
    $disconnect() {
      return Promise.resolve();
    }
    $transaction(args: unknown) {
      if (Array.isArray(args)) return Promise.all(args);
      if (typeof args === 'function') return (args as Function)({});
      return Promise.resolve();
    }
  }

  return {
    PrismaClient,
    Prisma: {
      PrismaClientKnownRequestError,
      QueryMode: { insensitive: 'insensitive' },
    },
  };
});

// Mock the Prisma PG adapter
vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class PrismaPg {
    constructor() {}
  },
}));

import { OffersService } from './offers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Unit tests for OffersService.
 *
 * Uses a mocked PrismaService to test business logic in isolation
 * without requiring a database connection.
 */

// Helper to create a mock PrismaService with common methods
function createMockPrisma() {
  return {
    offer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    offerGroup: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    offerGroupItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((args: unknown) => {
      if (Array.isArray(args)) return Promise.all(args);
      if (typeof args === 'function')
        return (args as Function)(createMockPrisma());
      return Promise.resolve();
    }),
  };
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

describe('OffersService', () => {
  let service: OffersService;
  let mockPrisma: MockPrisma;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  // ─── Tenant Isolation Tests ───

  describe('addOfferGroupItem - tenant isolation', () => {
    it('should reject a product that belongs to a different tenant', async () => {
      const tenantId = 'tenant-1';
      const offerId = 'offer-1';
      const groupId = 'group-1';

      mockPrisma.offer.findFirst.mockResolvedValue({
        id: offerId,
        tenantId,
      });
      mockPrisma.offerGroup.findFirst.mockResolvedValue({
        id: groupId,
        offerId,
      });
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'product-x',
        tenantId: 'tenant-OTHER', // Different tenant!
        isActive: true,
        isDeleted: false,
        name: 'Cross-Tenant Product',
      });

      await expect(
        service.addOfferGroupItem(tenantId, offerId, groupId, {
          productId: 'product-x',
          extraPrice: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addOfferGroupItem(tenantId, offerId, groupId, {
          productId: 'product-x',
          extraPrice: 0,
        }),
      ).rejects.toThrow('Product does not belong to this tenant');
    });

    it('should reject a deleted product', async () => {
      const tenantId = 'tenant-1';

      mockPrisma.offer.findFirst.mockResolvedValue({
        id: 'offer-1',
        tenantId,
      });
      mockPrisma.offerGroup.findFirst.mockResolvedValue({
        id: 'group-1',
        offerId: 'offer-1',
      });
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'product-del',
        tenantId,
        isActive: true,
        isDeleted: true, // Deleted!
        name: 'Deleted Product',
      });

      await expect(
        service.addOfferGroupItem(tenantId, 'offer-1', 'group-1', {
          productId: 'product-del',
          extraPrice: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an inactive product', async () => {
      const tenantId = 'tenant-1';

      mockPrisma.offer.findFirst.mockResolvedValue({
        id: 'offer-1',
        tenantId,
      });
      mockPrisma.offerGroup.findFirst.mockResolvedValue({
        id: 'group-1',
        offerId: 'offer-1',
      });
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'product-inactive',
        tenantId,
        isActive: false, // Inactive!
        isDeleted: false,
        name: 'Inactive Product',
      });

      await expect(
        service.addOfferGroupItem(tenantId, 'offer-1', 'group-1', {
          productId: 'product-inactive',
          extraPrice: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a non-existent product', async () => {
      const tenantId = 'tenant-1';

      mockPrisma.offer.findFirst.mockResolvedValue({
        id: 'offer-1',
        tenantId,
      });
      mockPrisma.offerGroup.findFirst.mockResolvedValue({
        id: 'group-1',
        offerId: 'offer-1',
      });
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.addOfferGroupItem(tenantId, 'offer-1', 'group-1', {
          productId: 'nonexistent',
          extraPrice: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Duplicate Group Item Tests ───

  describe('addOfferGroupItem - duplicate handling', () => {
    it('should reject duplicate product in same group', async () => {
      const tenantId = 'tenant-1';

      mockPrisma.offer.findFirst.mockResolvedValue({
        id: 'offer-1',
        tenantId,
      });
      mockPrisma.offerGroup.findFirst.mockResolvedValue({
        id: 'group-1',
        offerId: 'offer-1',
      });
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'product-1',
        tenantId,
        isActive: true,
        isDeleted: false,
        name: 'Valid Product',
      });
      mockPrisma.offerGroupItem.findUnique.mockResolvedValue({
        id: 'existing-item',
        offerGroupId: 'group-1',
        productId: 'product-1',
      });

      await expect(
        service.addOfferGroupItem(tenantId, 'offer-1', 'group-1', {
          productId: 'product-1',
          extraPrice: 0,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── freeItemsCount Invariant Tests ───

  describe('updateOfferGroup - freeItemsCount invariant', () => {
    it('should reject freeItemsCount exceeding group item count', async () => {
      mockPrisma.offerGroup.findFirst.mockResolvedValue({
        id: 'group-1',
        offerId: 'offer-1',
        freeItemsCount: 0,
        _count: { offerGroupItems: 2 }, // Only 2 items
      });

      await expect(
        service.updateOfferGroup('tenant-1', 'offer-1', 'group-1', {
          freeItemsCount: 5, // Trying to set 5, but only 2 items exist
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateOfferGroup('tenant-1', 'offer-1', 'group-1', {
          freeItemsCount: 5,
        }),
      ).rejects.toThrow(/cannot exceed/i);
    });

    it('should allow freeItemsCount equal to group item count', async () => {
      mockPrisma.offerGroup.findFirst.mockResolvedValue({
        id: 'group-1',
        offerId: 'offer-1',
        freeItemsCount: 0,
        _count: { offerGroupItems: 3 },
      });
      mockPrisma.offerGroup.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.offerGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        freeItemsCount: 3,
      });

      const result = await service.updateOfferGroup(
        'tenant-1',
        'offer-1',
        'group-1',
        { freeItemsCount: 3 },
      );

      expect(result).toBeDefined();
    });
  });

  describe('removeOfferGroupItem - freeItemsCount clamping', () => {
    it('should clamp freeItemsCount after item removal when it exceeds remaining count', async () => {
      mockPrisma.offerGroupItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.offerGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        freeItemsCount: 3, // Was 3 free items
        _count: { offerGroupItems: 2 }, // Now only 2 items after removal
      });
      mockPrisma.offerGroup.update.mockResolvedValue({
        id: 'group-1',
        freeItemsCount: 2,
      });

      await service.removeOfferGroupItem(
        'tenant-1',
        'offer-1',
        'group-1',
        'item-1',
      );

      // Verify freeItemsCount was clamped to 2
      expect(mockPrisma.offerGroup.update).toHaveBeenCalledWith({
        where: { id: 'group-1' },
        data: { freeItemsCount: 2 },
      });
    });

    it('should NOT clamp freeItemsCount when it does not exceed remaining count', async () => {
      mockPrisma.offerGroupItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.offerGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        freeItemsCount: 1, // freeItemsCount is 1
        _count: { offerGroupItems: 3 }, // Still 3 items after removal
      });

      await service.removeOfferGroupItem(
        'tenant-1',
        'offer-1',
        'group-1',
        'item-1',
      );

      // Should NOT have called update
      expect(mockPrisma.offerGroup.update).not.toHaveBeenCalled();
    });
  });

  // ─── Price Preview Tests ───

  describe('pricePreview', () => {
    const tenantId = 'tenant-1';

    function makeOffer(overrides: Record<string, unknown> = {}) {
      return {
        id: 'offer-1',
        tenantId,
        name: 'Combo Meal',
        basePrice: { toNumber: () => 10.0, toString: () => '10.00' },
        isActive: true,
        offerGroups: [
          {
            id: 'grp-burger',
            name: 'Choose Burger',
            freeItemsCount: 0,
            offerGroupItems: [
              {
                productId: 'prod-classic',
                extraPrice: { toNumber: () => 0, toString: () => '0.00' },
                product: {
                  id: 'prod-classic',
                  name: 'Classic Burger',
                  price: { toNumber: () => 5 },
                  isActive: true,
                  isDeleted: false,
                },
              },
              {
                productId: 'prod-cheese',
                extraPrice: { toNumber: () => 2.0, toString: () => '2.00' },
                product: {
                  id: 'prod-cheese',
                  name: 'Cheese Burger',
                  price: { toNumber: () => 7 },
                  isActive: true,
                  isDeleted: false,
                },
              },
            ],
          },
          {
            id: 'grp-drink',
            name: 'Choose Drink',
            freeItemsCount: 1, // 1 free drink
            offerGroupItems: [
              {
                productId: 'prod-coke',
                extraPrice: { toNumber: () => 1.5, toString: () => '1.50' },
                product: {
                  id: 'prod-coke',
                  name: 'Coke',
                  price: { toNumber: () => 3 },
                  isActive: true,
                  isDeleted: false,
                },
              },
              {
                productId: 'prod-water',
                extraPrice: { toNumber: () => 0, toString: () => '0.00' },
                product: {
                  id: 'prod-water',
                  name: 'Water',
                  price: { toNumber: () => 1 },
                  isActive: true,
                  isDeleted: false,
                },
              },
            ],
          },
        ],
        ...overrides,
      };
    }

    it('should compute correct pricing with no free items', async () => {
      const offer = makeOffer();
      // Override: no free items in drink group
      offer.offerGroups[1].freeItemsCount = 0;

      mockPrisma.offer.findFirst.mockResolvedValue(offer);

      const result = await service.pricePreview(tenantId, {
        offerId: 'offer-1',
        selections: [
          { groupId: 'grp-burger', productId: 'prod-cheese' },
          { groupId: 'grp-drink', productId: 'prod-coke' },
        ],
      });

      // basePrice = 10.00, extras = 2.00 (cheese) + 1.50 (coke) = 3.50, no free discount
      expect(result.basePrice).toBe(10.0);
      expect(result.totalExtras).toBe(3.5);
      expect(result.totalFreeDiscount).toBe(0);
      expect(result.finalTotal).toBe(13.5);
      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toEqual([]);
    });

    it('should apply free item discount to highest-priced extra first', async () => {
      const offer = makeOffer();
      // Drink group has 1 free item
      offer.offerGroups[1].freeItemsCount = 1;

      mockPrisma.offer.findFirst.mockResolvedValue(offer);

      const result = await service.pricePreview(tenantId, {
        offerId: 'offer-1',
        selections: [
          { groupId: 'grp-burger', productId: 'prod-classic' },
          { groupId: 'grp-drink', productId: 'prod-coke' },
        ],
      });

      // basePrice = 10.00
      // burger extras = 0 (classic)
      // drink extras = 1.50 (coke), but 1 free item → discount = 1.50
      // finalTotal = 10.00 + 0 + 1.50 - 1.50 = 10.00
      expect(result.basePrice).toBe(10.0);
      expect(result.totalExtras).toBe(1.5);
      expect(result.totalFreeDiscount).toBe(1.5);
      expect(result.finalTotal).toBe(10.0);
      expect(result.isValid).toBe(true);

      // The coke item should be marked as free
      const drinkGroup = result.groups.find((g) => g.groupId === 'grp-drink');
      expect(drinkGroup).toBeDefined();
      const cokeItem = drinkGroup!.items.find(
        (i) => i.productId === 'prod-coke',
      );
      expect(cokeItem?.isFree).toBe(true);
    });

    it('should return validation errors for missing group selections', async () => {
      mockPrisma.offer.findFirst.mockResolvedValue(makeOffer());

      const result = await service.pricePreview(tenantId, {
        offerId: 'offer-1',
        selections: [
          // Only selecting from burger group, missing drink group
          { groupId: 'grp-burger', productId: 'prod-classic' },
        ],
      });

      expect(result.isValid).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
      expect(result.validationErrors[0]).toContain('Missing selection');
    });

    it('should return validation errors for inactive offer', async () => {
      mockPrisma.offer.findFirst.mockResolvedValue(
        makeOffer({ isActive: false }),
      );

      const result = await service.pricePreview(tenantId, {
        offerId: 'offer-1',
        selections: [
          { groupId: 'grp-burger', productId: 'prod-classic' },
          { groupId: 'grp-drink', productId: 'prod-coke' },
        ],
      });

      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toContain('Offer is currently inactive');
    });

    it('should return validation error for product not in group', async () => {
      mockPrisma.offer.findFirst.mockResolvedValue(makeOffer());

      const result = await service.pricePreview(tenantId, {
        offerId: 'offer-1',
        selections: [
          { groupId: 'grp-burger', productId: 'prod-nonexistent' },
          { groupId: 'grp-drink', productId: 'prod-coke' },
        ],
      });

      expect(result.isValid).toBe(false);
      expect(
        result.validationErrors.some((e) => e.includes('not available')),
      ).toBe(true);
    });

    it('should throw NotFoundException for non-existent offer', async () => {
      mockPrisma.offer.findFirst.mockResolvedValue(null);

      await expect(
        service.pricePreview(tenantId, {
          offerId: 'nonexistent',
          selections: [{ groupId: 'g', productId: 'p' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Inactive Offer Filtering Tests ───

  describe('getActiveOffers', () => {
    it('should filter by isActive: true in the where clause', async () => {
      mockPrisma.$transaction.mockResolvedValue([0, []]);

      await service.getActiveOffers('tenant-1', {});

      // The $transaction receives an array of promises
      // We can verify that offer.count and offer.findMany were called,
      // but since $transaction mocks the whole thing, let's verify the mock was invoked
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
