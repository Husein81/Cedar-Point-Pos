import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TableStatus } from '../../generated/prisma/client.js';
import { TablesController } from './tables.controller.js';
import { TablesService } from './tables.service.js';

describe('TablesController', () => {
  let controller: TablesController;
  let service: TablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TablesController],
      providers: [
        {
          provide: TablesService,
          useValue: {
            getTablesByBranch: vi.fn(),
            getTablesOverview: vi.fn(),
            getTablesByFloor: vi.fn(),
            getTableStats: vi.fn(),
            getTableById: vi.fn(),
            getActiveOrdersByTable: vi.fn(),
            createTable: vi.fn(),
            updateTableLayout: vi.fn(),
            updateTable: vi.fn(),
            updateTableStatus: vi.fn(),
            deleteTable: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TablesController>(TablesController);
    service = module.get<TablesService>(TablesService);
  });

  describe('getTablesByBranch', () => {
    it('should get all tables for a branch', () => {
      const mockTables = [
        {
          id: 'table-1',
          name: 'Table 1',
          seating: 4,
          status: TableStatus.AVAILABLE,
        },
        {
          id: 'table-2',
          name: 'Table 2',
          seating: 6,
          status: TableStatus.OCCUPIED,
        },
      ];

      vi.mocked(service.getTablesByBranch).mockReturnValue(mockTables as any);

      const result = controller.getTablesByBranch('branch-1', 'tenant-1');

      expect(result).toEqual(mockTables);
      expect(service.getTablesByBranch).toHaveBeenCalledWith(
        'branch-1',
        'tenant-1',
      );
    });

    it('should return empty array when no tables exist', () => {
      vi.mocked(service.getTablesByBranch).mockReturnValue([] as any);

      const result = controller.getTablesByBranch('branch-1', 'tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('getTablesOverview', () => {
    it('should get tables overview with active orders', () => {
      const mockTablesOverview = [
        {
          id: 'table-1',
          name: 'Table 1',
          status: TableStatus.OCCUPIED,
          activeOrders: [
            {
              id: 'order-1',
              total: 100,
            },
          ],
        },
      ];

      vi.mocked(service.getTablesOverview).mockReturnValue(
        mockTablesOverview as any,
      );

      const result = controller.getTablesOverview('branch-1', 'tenant-1');

      expect(result).toEqual(mockTablesOverview);
      expect(service.getTablesOverview).toHaveBeenCalledWith(
        'branch-1',
        'tenant-1',
      );
    });
  });

  describe('getTablesByFloor', () => {
    it('should get tables by floor ID', () => {
      const mockTables = [
        {
          id: 'table-1',
          name: 'Table 1',
          floorId: 'floor-1',
          status: TableStatus.AVAILABLE,
        },
      ];

      vi.mocked(service.getTablesByFloor).mockReturnValue(mockTables as any);

      const result = controller.getTablesByFloor('floor-1', 'tenant-1');

      expect(result).toEqual(mockTables);
      expect(service.getTablesByFloor).toHaveBeenCalledWith(
        'floor-1',
        'tenant-1',
      );
    });
  });

  describe('getTableStats', () => {
    it('should get table statistics', () => {
      const mockStats = {
        totalTables: 10,
        occupiedTables: 5,
        availableTables: 5,
      };

      vi.mocked(service.getTableStats).mockReturnValue(mockStats as any);

      const result = controller.getTableStats('branch-1', 'tenant-1');

      expect(result).toEqual(mockStats);
      expect(service.getTableStats).toHaveBeenCalledWith('branch-1', 'tenant-1');
    });
  });

  describe('getTableById', () => {
    it('should get a table by ID', () => {
      const mockTable = {
        id: 'table-1',
        name: 'Table 1',
        seating: 4,
        status: TableStatus.AVAILABLE,
      };

      vi.mocked(service.getTableById).mockReturnValue(mockTable as any);

      const result = controller.getTableById('table-1', 'tenant-1');

      expect(result).toEqual(mockTable);
      expect(service.getTableById).toHaveBeenCalledWith('table-1', 'tenant-1');
    });
  });

  describe('getActiveOrdersByTable', () => {
    it('should get active orders by table', () => {
      const mockOrders = [
        {
          id: 'order-1',
          total: 100,
          status: 'DRAFT',
        },
      ];

      vi.mocked(service.getActiveOrdersByTable).mockReturnValue(
        mockOrders as any,
      );

      const result = controller.getActiveOrdersByTable('table-1', 'tenant-1');

      expect(result).toEqual(mockOrders);
      expect(service.getActiveOrdersByTable).toHaveBeenCalledWith(
        'table-1',
        'tenant-1',
      );
    });
  });

  describe('createTable', () => {
    it('should create a new table', () => {
      const dto = {
        name: 'Table 1',
        seating: 4,
        branchId: 'branch-1',
        floorId: 'floor-1',
      };

      const mockCreatedTable = {
        id: 'table-1',
        ...dto,
        status: TableStatus.AVAILABLE,
      };

      vi.mocked(service.createTable).mockReturnValue(
        mockCreatedTable as any,
      );

      const result = controller.createTable(dto as any, 'tenant-1');

      expect(result).toEqual(mockCreatedTable);
      expect(service.createTable).toHaveBeenCalledWith(dto, 'tenant-1');
    });
  });

  describe('updateTableLayout', () => {
    it('should update table layout', () => {
      const body = {
        tables: [
          {
            id: 'table-1',
            posX: 0,
            posY: 0,
            width: 100,
            height: 100,
            rotation: 0,
          },
        ],
      };

      const mockResult = { success: true };

      vi.mocked(service.updateTableLayout).mockReturnValue(mockResult as any);

      const result = controller.updateTableLayout(body as any, 'tenant-1');

      expect(result).toEqual(mockResult);
      expect(service.updateTableLayout).toHaveBeenCalledWith(body, 'tenant-1');
    });
  });

  describe('updateTable', () => {
    it('should update a table', () => {
      const dto = {
        name: 'Updated Table',
        seating: 6,
      };

      const mockUpdatedTable = {
        id: 'table-1',
        ...dto,
        status: TableStatus.AVAILABLE,
      };

      vi.mocked(service.updateTable).mockReturnValue(
        mockUpdatedTable as any,
      );

      const result = controller.updateTable('table-1', dto as any, 'tenant-1');

      expect(result).toEqual(mockUpdatedTable);
      expect(service.updateTable).toHaveBeenCalledWith(
        'table-1',
        dto,
        'tenant-1',
      );
    });
  });

  describe('updateTableStatus', () => {
    it('should update table status', () => {
      const body = { status: TableStatus.OCCUPIED };

      const mockUpdatedTable = {
        id: 'table-1',
        name: 'Table 1',
        status: TableStatus.OCCUPIED,
      };

      vi.mocked(service.updateTableStatus).mockReturnValue(
        mockUpdatedTable as any,
      );

      const result = controller.updateTableStatus(
        'table-1',
        body,
        'tenant-1',
      );

      expect(result).toEqual(mockUpdatedTable);
      expect(service.updateTableStatus).toHaveBeenCalledWith(
        'table-1',
        body,
        'tenant-1',
      );
    });
  });

  describe('deleteTable', () => {
    it('should delete a table', () => {
      const mockResult = { success: true };

      vi.mocked(service.deleteTable).mockReturnValue(mockResult as any);

      const result = controller.deleteTable('table-1', 'tenant-1');

      expect(result).toEqual(mockResult);
      expect(service.deleteTable).toHaveBeenCalledWith('table-1', 'tenant-1');
    });
  });
});
