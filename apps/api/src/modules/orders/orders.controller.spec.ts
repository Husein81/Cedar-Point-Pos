import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, OrderType, UserRole } from '@repo/types';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            create: vi.fn(),
            findAll: vi.fn(),
            findOne: vi.fn(),
            updateStatus: vi.fn(),
            processPayment: vi.fn(),
            updateDiscount: vi.fn(),
            assignTableToOrder: vi.fn(),
            transferOrderToTable: vi.fn(),
            mergeOrders: vi.fn(),
            splitOrder: vi.fn(),
            addItemToOrder: vi.fn(),
            batchAddItemsToOrder: vi.fn(),
            updateItemQuantity: vi.fn(),
            removeItemFromOrder: vi.fn(),
            updateItemDiscount: vi.fn(),
            previewOrderStockDeductions: vi.fn(),
            sendToKitchen: vi.fn(),
            addOfferItemsToOrder: vi.fn(),
            getNextOrderNumber: vi.fn(),
            findActiveOrderByTableId: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('should create a new order', () => {
      const mockRequest = {
        user: { tenantId: 'tenant-1', id: 'user-1' },
      };
      const dto = { branchId: 'branch-1', type: OrderType.RETAIL };
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.DRAFT,
        total: 0,
      };

      vi.mocked(service.create).mockReturnValue(mockOrder as any);

      const result = controller.create(mockRequest as any, dto as any);

      expect(result).toEqual(mockOrder);
      expect(service.create).toHaveBeenCalledWith(
        { tenantId: 'tenant-1', userId: 'user-1' },
        dto,
      );
    });
  });

  describe('findAll', () => {
    it('should get all orders with pagination', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const mockOrders = [
        { id: 'order-1', status: OrderStatus.DRAFT, total: 100 },
      ];

      vi.mocked(service.findAll).mockReturnValue(mockOrders as any);

      const result = controller.findAll(mockRequest as any);

      expect(result).toEqual(mockOrders);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should get order by ID', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.DRAFT,
        total: 0,
      };

      vi.mocked(service.findOne).mockReturnValue(mockOrder as any);

      const result = controller.findOne(mockRequest as any, 'order-1');

      expect(result).toEqual(mockOrder);
      expect(service.findOne).toHaveBeenCalledWith('tenant-1', 'order-1');
    });
  });

  describe('updateStatus', () => {
    it('should update order status', () => {
      const mockRequest = { user: { tenantId: 'tenant-1', id: 'user-1' } };
      const body = { status: OrderStatus.PLACED };
      const mockUpdatedOrder = {
        id: 'order-1',
        status: OrderStatus.PLACED,
      };

      vi.mocked(service.updateStatus).mockReturnValue(
        mockUpdatedOrder as any,
      );

      const result = controller.updateStatus(
        mockRequest as any,
        'order-1',
        body,
        UserRole.CASHIER,
      );

      expect(result).toEqual(mockUpdatedOrder);
      expect(service.updateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          nextStatus: OrderStatus.PLACED,
          actorRole: UserRole.CASHIER,
        }),
      );
    });
  });

  describe('processPayment', () => {
    it('should process payment for order', () => {
      const mockRequest = { user: { tenantId: 'tenant-1', id: 'user-1' } };
      const dto = { amount: 100, method: 'CASH' };
      const mockResult = { success: true };

      vi.mocked(service.processPayment).mockReturnValue(mockResult as any);

      const result = controller.processPayment(mockRequest as any, 'order-1', dto as any);

      expect(result).toEqual(mockResult);
      expect(service.processPayment).toHaveBeenCalled();
    });
  });

  describe('updateDiscount', () => {
    it('should update order discount', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const body = { discount: 10 };
      const mockUpdatedOrder = {
        id: 'order-1',
        discount: 10,
        total: 90,
      };

      vi.mocked(service.updateDiscount).mockReturnValue(
        mockUpdatedOrder as any,
      );

      const result = controller.updateDiscount(mockRequest as any, 'order-1', body);

      expect(result).toEqual(mockUpdatedOrder);
      expect(service.updateDiscount).toHaveBeenCalledWith(
        'tenant-1',
        'order-1',
        10,
      );
    });
  });

  describe('assignTableToOrder', () => {
    it('should assign table to order', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const dto = { tableId: 'table-1' };
      const mockUpdatedOrder = {
        id: 'order-1',
        tableId: 'table-1',
      };

      vi.mocked(service.assignTableToOrder).mockReturnValue(
        mockUpdatedOrder as any,
      );

      const result = controller.assignTableToOrder(
        mockRequest as any,
        'order-1',
        dto,
      );

      expect(result).toEqual(mockUpdatedOrder);
      expect(service.assignTableToOrder).toHaveBeenCalledWith(
        'tenant-1',
        'order-1',
        'table-1',
      );
    });

    it('should throw BadRequestException when tableId is missing', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const dto = { tableId: '' };

      expect(() =>
        controller.assignTableToOrder(mockRequest as any, 'order-1', dto),
      ).toThrow(BadRequestException);
    });
  });

  describe('addItemToOrder', () => {
    it('should add item to order', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const dto = {
        productId: 'product-1',
        quantity: 2,
        branchId: 'branch-1',
      };
      const mockUpdatedOrder = {
        id: 'order-1',
        items: [{ productId: 'product-1', quantity: 2 }],
      };

      vi.mocked(service.addItemToOrder).mockReturnValue(
        mockUpdatedOrder as any,
      );

      const result = controller.addItemToOrder(
        mockRequest as any,
        'order-1',
        dto as any,
      );

      expect(result).toEqual(mockUpdatedOrder);
      expect(service.addItemToOrder).toHaveBeenCalledWith(
        'tenant-1',
        'order-1',
        dto,
      );
    });
  });

  describe('removeItemFromOrder', () => {
    it('should remove item from order', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const mockUpdatedOrder = {
        id: 'order-1',
        items: [],
      };

      vi.mocked(service.removeItemFromOrder).mockReturnValue(
        mockUpdatedOrder as any,
      );

      const result = controller.removeItemFromOrder(
        mockRequest as any,
        'order-1',
        'item-1',
      );

      expect(result).toEqual(mockUpdatedOrder);
      expect(service.removeItemFromOrder).toHaveBeenCalledWith(
        'tenant-1',
        'order-1',
        'item-1',
      );
    });
  });

  describe('getNextOrderNumber', () => {
    it('should get next order number', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const mockResult = { number: 'ORD001' };

      vi.mocked(service.getNextOrderNumber).mockReturnValue(mockResult as any);

      const result = controller.getNextOrderNumber(mockRequest as any, 'branch-1');

      expect(result).toEqual(mockResult);
      expect(service.getNextOrderNumber).toHaveBeenCalledWith('branch-1');
    });

    it('should throw BadRequestException when branchId is missing', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };

      expect(() =>
        controller.getNextOrderNumber(mockRequest as any, ''),
      ).toThrow(BadRequestException);
    });
  });

  describe('findActiveOrderByTable', () => {
    it('should find active order by table', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const mockOrder = {
        id: 'order-1',
        tableId: 'table-1',
        status: OrderStatus.DRAFT,
      };

      vi.mocked(service.findActiveOrderByTableId).mockReturnValue(
        mockOrder as any,
      );

      const result = controller.findActiveOrderByTable(
        mockRequest as any,
        'table-1',
      );

      expect(result).toEqual(mockOrder);
      expect(service.findActiveOrderByTableId).toHaveBeenCalledWith(
        'tenant-1',
        'table-1',
      );
    });
  });

  describe('transferOrderToTable', () => {
    it('should transfer order to another table', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const body = { targetTableId: 'table-2' };
      const mockUpdatedOrder = {
        id: 'order-1',
        tableId: 'table-2',
      };

      vi.mocked(service.transferOrderToTable).mockReturnValue(
        mockUpdatedOrder as any,
      );

      const result = controller.transferOrderToTable(
        mockRequest as any,
        'order-1',
        body,
      );

      expect(result).toEqual(mockUpdatedOrder);
      expect(service.transferOrderToTable).toHaveBeenCalled();
    });

    it('should throw BadRequestException when targetTableId is missing', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const body = { targetTableId: '' };

      expect(() =>
        controller.transferOrderToTable(mockRequest as any, 'order-1', body),
      ).toThrow(BadRequestException);
    });
  });

  describe('mergeOrders', () => {
    it('should merge two orders', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const body = { sourceOrderId: 'order-2' };
      const mockMergedOrder = {
        id: 'order-1',
        items: [{ id: 'item-1' }, { id: 'item-2' }],
      };

      vi.mocked(service.mergeOrders).mockReturnValue(mockMergedOrder as any);

      const result = controller.mergeOrders(mockRequest as any, 'order-1', body);

      expect(result).toEqual(mockMergedOrder);
      expect(service.mergeOrders).toHaveBeenCalled();
    });

    it('should throw BadRequestException when sourceOrderId is missing', () => {
      const mockRequest = { user: { tenantId: 'tenant-1' } };
      const body = { sourceOrderId: '' };

      expect(() =>
        controller.mergeOrders(mockRequest as any, 'order-1', body),
      ).toThrow(BadRequestException);
    });
  });

  describe('sendToKitchen', () => {
    it('should send order to kitchen', () => {
      const mockRequest = { user: { tenantId: 'tenant-1', id: 'user-1' } };
      const mockResult = { success: true };

      vi.mocked(service.sendToKitchen).mockReturnValue(mockResult as any);

      const result = controller.sendToKitchen(mockRequest as any, 'order-1');

      expect(result).toEqual(mockResult);
      expect(service.sendToKitchen).toHaveBeenCalled();
    });
  });
});
