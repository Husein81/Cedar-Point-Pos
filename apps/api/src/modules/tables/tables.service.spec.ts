import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, TableStatus } from '../../generated/prisma/client.js';
import { TablesService } from './tables.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TableStatusService } from './table-status.service.js';

describe('TablesService', () => {
  let service: TablesService;
  let prisma: PrismaService;
  let tableStatusService: TableStatusService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        {
          provide: PrismaService,
          useValue: {
            table: {
              create: vi.fn(),
              findMany: vi.fn(),
              findFirst: vi.fn(),
              findUnique: vi.fn(),
              update: vi.fn(),
              updateMany: vi.fn(),
              delete: vi.fn(),
            },
            order: {
              findMany: vi.fn(),
              findFirst: vi.fn(),
            },
            floor: {
              findFirst: vi.fn(),
            },
            $transaction: vi.fn(),
          },
        },
        {
          provide: TableStatusService,
          useValue: {
            getTableStatus: vi.fn(),
            updateTableStatus: vi.fn(),
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

    service = module.get<TablesService>(TablesService);
    prisma = module.get<PrismaService>(PrismaService);
    tableStatusService = module.get<TableStatusService>(TableStatusService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('getTablesByBranch', () => {
    it('should get all tables for a branch', async () => {
      const branchId = 'branch-1';
      const tenantId = 'tenant-1';

      const mockTables = [
        {
          id: 'table-1',
          tenantId,
          branchId,
          name: 'Table 1',
          seating: 4,
          status: TableStatus.AVAILABLE,
          posX: 0,
          posY: 0,
          width: 100,
          height: 100,
          rotation: 0,
          floorId: 'floor-1',
          deletedAt: null,
        },
        {
          id: 'table-2',
          tenantId,
          branchId,
          name: 'Table 2',
          seating: 6,
          status: TableStatus.AVAILABLE,
          posX: 150,
          posY: 0,
          width: 100,
          height: 100,
          rotation: 0,
          floorId: 'floor-1',
          deletedAt: null,
        },
      ];

      vi.mocked(prisma.table.findMany).mockResolvedValue(mockTables as any);

      const result = await service.getTablesByBranch(branchId, tenantId);

      expect(result).toEqual(mockTables);
      expect(prisma.table.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branchId,
            tenantId,
            deletedAt: null,
          }),
        }),
      );
    });

    it('should return empty array when no tables exist', async () => {
      const branchId = 'branch-1';
      const tenantId = 'tenant-1';

      vi.mocked(prisma.table.findMany).mockResolvedValue([]);

      const result = await service.getTablesByBranch(branchId, tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('getTableById', () => {
    it('should get a table by ID and tenantId', async () => {
      const tableId = 'table-1';
      const tenantId = 'tenant-1';

      const mockTable = {
        id: tableId,
        tenantId,
        name: 'Table 1',
        seating: 4,
        status: TableStatus.AVAILABLE,
        posX: 0,
        posY: 0,
        width: 100,
        height: 100,
        rotation: 0,
        floorId: 'floor-1',
        branchId: 'branch-1',
        deletedAt: null,
      };

      vi.mocked(prisma.table.findFirst).mockResolvedValue(mockTable as any);

      const result = await service.getTableById(tableId, tenantId);

      expect(result).toEqual(mockTable);
      expect(prisma.table.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: tableId,
            tenantId,
            deletedAt: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException when table not found', async () => {
      const tableId = 'nonexistent';
      const tenantId = 'tenant-1';

      vi.mocked(prisma.table.findFirst).mockResolvedValue(null);

      await expect(service.getTableById(tableId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTable', () => {
    it('should create a new table', async () => {
      const tenantId = 'tenant-1';
      const dto = {
        name: 'Table 1',
        seating: 4,
        branchId: 'branch-1',
        floorId: 'floor-1',
      };

      const mockCreatedTable = {
        id: 'table-1',
        tenantId,
        ...dto,
        status: TableStatus.AVAILABLE,
        posX: 0,
        posY: 0,
        width: 160,
        height: 120,
        rotation: 0,
        deletedAt: null,
      };

      vi.mocked(prisma.floor.findFirst).mockResolvedValue({
        id: 'floor-1',
        tenantId,
      } as any);

      vi.mocked(prisma.table.findMany).mockResolvedValue([]);

      vi.mocked(prisma.table.create).mockResolvedValue(
        mockCreatedTable as any,
      );

      vi.mocked(eventEmitter.emit).mockReturnValue(true);

      const result = await service.createTable(dto as any, tenantId);

      expect(result).toBeDefined();
      expect(prisma.table.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('table.updated', {
        branchId: dto.branchId,
      });
    });

    it('should throw NotFoundException when floor does not exist', async () => {
      const tenantId = 'tenant-1';
      const dto = {
        name: 'Table 1',
        seating: 4,
        branchId: 'branch-1',
        floorId: 'nonexistent',
      };

      vi.mocked(prisma.floor.findFirst).mockResolvedValue(null);

      await expect(service.createTable(dto as any, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTable', () => {
    it('should update a table', async () => {
      const tableId = 'table-1';
      const tenantId = 'tenant-1';
      const branchId = 'branch-1';
      const dto = {
        name: 'Updated Table',
        seating: 6,
      };

      vi.mocked(prisma.table.findFirst).mockResolvedValue({
        id: tableId,
        tenantId,
        branchId,
        name: 'Table 1',
        seating: 4,
      } as any);

      vi.mocked(prisma.table.update).mockResolvedValue({
        id: tableId,
        tenantId,
        branchId,
        ...dto,
      } as any);

      vi.mocked(eventEmitter.emit).mockReturnValue(true);

      const result = await service.updateTable(tableId, dto as any, tenantId);

      expect(result).toBeDefined();
      expect(prisma.table.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('table.updated', {
        branchId,
      });
    });

    it('should throw NotFoundException when table not found', async () => {
      const tableId = 'nonexistent';
      const tenantId = 'tenant-1';
      const dto = { name: 'Updated Table' };

      vi.mocked(prisma.table.findFirst).mockResolvedValue(null);

      await expect(
        service.updateTable(tableId, dto as any, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTable', () => {
    it('should soft-delete a table', async () => {
      const tableId = 'table-1';
      const tenantId = 'tenant-1';
      const branchId = 'branch-1';

      vi.mocked(prisma.table.findFirst).mockResolvedValue({
        id: tableId,
        tenantId,
        branchId,
        name: 'Table 1',
      } as any);

      vi.mocked(prisma.table.update).mockResolvedValue({
        id: tableId,
        deletedAt: new Date(),
      } as any);

      vi.mocked(eventEmitter.emit).mockReturnValue(true);

      const result = await service.deleteTable(tableId, tenantId);

      expect(result).toBeDefined();
      expect(prisma.table.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('table.updated', {
        branchId,
      });
    });

    it('should throw NotFoundException when table not found', async () => {
      const tableId = 'nonexistent';
      const tenantId = 'tenant-1';

      vi.mocked(prisma.table.findFirst).mockResolvedValue(null);

      await expect(service.deleteTable(tableId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTablesByFloor', () => {
    it('should get tables by floor ID', async () => {
      const floorId = 'floor-1';
      const tenantId = 'tenant-1';

      const mockTables = [
        {
          id: 'table-1',
          tenantId,
          floorId,
          name: 'Table 1',
          status: TableStatus.AVAILABLE,
        },
      ];

      vi.mocked(prisma.table.findMany).mockResolvedValue(mockTables as any);

      const result = await service.getTablesByFloor(floorId, tenantId);

      expect(result).toEqual(mockTables);
      expect(prisma.table.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            floorId,
            tenantId,
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('updateTableStatus', () => {
    it('should update table status', async () => {
      const tableId = 'table-1';
      const tenantId = 'tenant-1';
      const branchId = 'branch-1';
      const status = TableStatus.OCCUPIED;

      vi.mocked(prisma.table.findFirst).mockResolvedValue({
        id: tableId,
        tenantId,
        branchId,
        status: TableStatus.AVAILABLE,
      } as any);

      vi.mocked(prisma.table.update).mockResolvedValue({
        id: tableId,
        status,
      } as any);

      vi.mocked(eventEmitter.emit).mockReturnValue(true);

      const result = await service.updateTableStatus(
        tableId,
        { status },
        tenantId,
      );

      expect(result).toBeDefined();
      expect(prisma.table.update).toHaveBeenCalled();
    });
  });

  describe('getTablesOverview', () => {
    it('should get tables overview with active orders', async () => {
      const branchId = 'branch-1';
      const tenantId = 'tenant-1';

      const mockTablesWithOrders = [
        {
          id: 'table-1',
          name: 'Table 1',
          status: TableStatus.OCCUPIED,
          activeOrders: [
            {
              id: 'order-1',
              status: OrderStatus.DRAFT,
              total: 100,
            },
          ],
        },
      ];

      vi.mocked(prisma.table.findMany).mockResolvedValue(
        mockTablesWithOrders as any,
      );

      const result = await service.getTablesOverview(branchId, tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTableStats', () => {
    it('should get table statistics', async () => {
      const branchId = 'branch-1';
      const tenantId = 'tenant-1';

      const mockStats = {
        totalTables: 10,
        occupiedTables: 5,
        availableTables: 5,
      };

      vi.mocked(prisma.table.findMany).mockResolvedValue([
        { status: TableStatus.AVAILABLE },
        { status: TableStatus.AVAILABLE },
        { status: TableStatus.AVAILABLE },
        { status: TableStatus.AVAILABLE },
        { status: TableStatus.AVAILABLE },
        { status: TableStatus.OCCUPIED },
        { status: TableStatus.OCCUPIED },
        { status: TableStatus.OCCUPIED },
        { status: TableStatus.OCCUPIED },
        { status: TableStatus.OCCUPIED },
      ] as any);

      const result = await service.getTableStats(branchId, tenantId);

      expect(result).toBeDefined();
    });
  });
});
