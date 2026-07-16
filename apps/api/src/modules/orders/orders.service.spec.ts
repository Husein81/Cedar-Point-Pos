import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, OrderType, PaymentMethod } from '@repo/types';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryDeductionService } from '../inventory/inventory-deduction.service.js';
import { TableStatusService } from '../tables/table-status.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { OffersService } from '../offers/offers.service.js';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let inventoryDeductionService: InventoryDeductionService;
  let tableStatusService: TableStatusService;
  let loyaltyService: LoyaltyService;
  let offersService: OffersService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: vi.fn(),
              findMany: vi.fn(),
              findFirst: vi.fn(),
              findUnique: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
            orderItem: {
              create: vi.fn(),
              findMany: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
            orderSequence: {
              upsert: vi.fn(),
            },
            payment: {
              create: vi.fn(),
              findFirst: vi.fn(),
            },
            $transaction: vi.fn(),
          },
        },
        {
          provide: InventoryDeductionService,
          useValue: {
            processInventoryDeduction: vi.fn(),
            previewDeductions: vi.fn(),
          },
        },
        {
          provide: TableStatusService,
          useValue: {
            updateTableStatus: vi.fn(),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            recordLoyaltyTransaction: vi.fn(),
          },
        },
        {
          provide: OffersService,
          useValue: {
            getOfferById: vi.fn(),
            getOfferItems: vi.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryDeductionService = module.get<InventoryDeductionService>(
      InventoryDeductionService,
    );
    tableStatusService = module.get<TableStatusService>(TableStatusService);
    loyaltyService = module.get<LoyaltyService>(LoyaltyService);
    offersService = module.get<OffersService>(OffersService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('create', () => {
    it('should create an order with DRAFT status', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const branchId = 'branch-1';

      const mockOrder = {
        id: 'order-1',
        tenantId,
        branchId,
        userId,
        status: OrderStatus.DRAFT,
        type: OrderType.RETAIL,
        totalItems: 0,
        subtotal: 0,
        vat: 0,
        total: 0,
        discount: 0,
        orderNumber: 'ORD001',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tableId: null,
      };

      vi.mocked(prisma.order.create).mockResolvedValue(mockOrder as any);

      const result = await service.create(
        { tenantId, userId },
        { branchId, type: OrderType.RETAIL },
      );

      expect(result).toEqual(mockOrder);
      expect(prisma.order.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find an order by ID and tenantId', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';

      const mockOrder = {
        id: orderId,
        tenantId,
        status: OrderStatus.DRAFT,
        total: 0,
        items: [],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      const result = await service.findOne(tenantId, orderId);

      expect(result).toEqual(mockOrder);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: orderId,
            tenantId,
          }),
        }),
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'nonexistent';

      vi.mocked(prisma.order.findFirst).mockResolvedValue(null);

      await expect(service.findOne(tenantId, orderId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDiscount', () => {
    it('should update order discount', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';
      const discount = 10;

      const mockUpdatedOrder = {
        id: orderId,
        tenantId,
        status: OrderStatus.DRAFT,
        discount,
        total: 90,
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue({
        id: orderId,
        status: OrderStatus.DRAFT,
      } as any);

      vi.mocked(prisma.order.update).mockResolvedValue(mockUpdatedOrder as any);

      const result = await service.updateDiscount(tenantId, orderId, discount);

      expect(result).toEqual(mockUpdatedOrder);
      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when order status is not DRAFT', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';
      const discount = 10;

      vi.mocked(prisma.order.findFirst).mockResolvedValue({
        id: orderId,
        status: OrderStatus.CONFIRMED,
      } as any);

      await expect(
        service.updateDiscount(tenantId, orderId, discount),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getNextOrderNumber', () => {
    it('should get next order number', async () => {
      const branchId = 'branch-1';

      vi.mocked(prisma.orderSequence.upsert).mockResolvedValue({
        branchId,
        lastValue: 123,
      } as any);

      const result = await service.getNextOrderNumber(branchId);

      expect(result).toBeDefined();
      expect(prisma.orderSequence.upsert).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should find all orders for a tenant with pagination', async () => {
      const tenantId = 'tenant-1';
      const params = {
        page: '1',
        limit: '10',
        status: OrderStatus.DRAFT,
        branchId: 'branch-1',
      };

      const mockOrders = [
        {
          id: 'order-1',
          tenantId,
          status: OrderStatus.DRAFT,
          total: 100,
        },
      ];

      vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);

      const result = await service.findAll(tenantId, params as any);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('addItemToOrder', () => {
    it('should add item to draft order', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';
      const dto = {
        productId: 'product-1',
        quantity: 2,
        branchId: 'branch-1',
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue({
        id: orderId,
        status: OrderStatus.DRAFT,
        totalItems: 0,
        subtotal: 100,
        vat: 11,
        total: 111,
      } as any);

      vi.mocked(prisma.orderItem.create).mockResolvedValue({
        id: 'item-1',
        orderId,
        productId: dto.productId,
        quantity: dto.quantity,
        price: 50,
      } as any);

      vi.mocked(prisma.order.update).mockResolvedValue({
        id: orderId,
        status: OrderStatus.DRAFT,
        items: [{ id: 'item-1' }],
      } as any);

      const result = await service.addItemToOrder(
        tenantId,
        orderId,
        dto as any,
      );

      expect(result).toBeDefined();
      expect(prisma.orderItem.create).toHaveBeenCalled();
    });
  });

  describe('removeItemFromOrder', () => {
    it('should remove item from draft order', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';
      const itemId = 'item-1';

      vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({
        id: itemId,
        orderId,
      } as any);

      vi.mocked(prisma.order.findFirst).mockResolvedValue({
        id: orderId,
        status: OrderStatus.DRAFT,
        items: [{ id: itemId }],
      } as any);

      vi.mocked(prisma.orderItem.delete).mockResolvedValue({
        id: itemId,
      } as any);

      vi.mocked(prisma.order.update).mockResolvedValue({
        id: orderId,
        items: [],
      } as any);

      const result = await service.removeItemFromOrder(
        tenantId,
        orderId,
        itemId,
      );

      expect(result).toBeDefined();
      expect(prisma.orderItem.delete).toHaveBeenCalled();
    });
  });

  describe('assignTableToOrder', () => {
    it('should assign table to order', async () => {
      const tenantId = 'tenant-1';
      const orderId = 'order-1';
      const tableId = 'table-1';

      vi.mocked(prisma.order.findFirst).mockResolvedValue({
        id: orderId,
        status: OrderStatus.DRAFT,
      } as any);

      vi.mocked(prisma.order.update).mockResolvedValue({
        id: orderId,
        tableId,
      } as any);

      const result = await service.assignTableToOrder(
        tenantId,
        orderId,
        tableId,
      );

      expect(result).toBeDefined();
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tableId }),
        }),
      );
    });
  });
});
