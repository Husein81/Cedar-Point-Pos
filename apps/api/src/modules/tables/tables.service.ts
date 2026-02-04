import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TableStatusService } from './table-status.service.js';
import type { TableStatus } from '../../generated/prisma/client.js';
import type {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStatusDto,
} from './dto/tables.dto.js';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tableStatusService: TableStatusService,
  ) {}

  /**
   * Centralized error handler to eliminate code duplication
   * Re-throws known exceptions, wraps unknown errors
   */
  private handleError(error: unknown, context: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    console.error(`Error in ${context}:`, error);
    throw new InternalServerErrorException(
      `Failed to ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  /**
   * Get all active tables for a branch (excludes soft-deleted tables)
   */
  async getTablesByBranch(branchId: string, tenantId: string) {
    return this.prisma.table.findMany({
      where: {
        branchId,
        tenantId,
        isDeleted: false,
      },
      include: {
        floor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ floor: { order: 'asc' } }, { tableNumber: 'asc' }],
    });
  }

  /**
   * Get all active tables for a specific floor
   * Optimized to reduce database calls
   */
  async getTablesByFloor(floorId: string, tenantId: string) {
    // Fetch tables and validate floor exists in single query
    const tables = await this.prisma.table.findMany({
      where: {
        floorId,
        tenantId,
        isDeleted: false,
      },
      orderBy: { tableNumber: 'asc' },
    });

    // If no tables found, verify floor exists to provide accurate error
    if (tables.length === 0) {
      const floorExists = await this.prisma.floor.findFirst({
        where: {
          id: floorId,
          tenantId,
          isDeleted: false,
        },
      });

      if (!floorExists) {
        throw new NotFoundException('Floor not found');
      }
    }

    return tables;
  }

  /**
   * Get a specific table by ID (only if not deleted)
   */
  async getTableById(id: string, tenantId: string) {
    const table = await this.prisma.table.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
      include: {
        floor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  /**
   * Create a new table with tenant scoping
   * Uses transaction to ensure data consistency
   */
  async createTable(data: CreateTableDto, tenantId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify branch belongs to tenant
        const branch = await tx.branch.findFirst({
          where: {
            id: data.branchId,
            tenantId,
            isDeleted: false,
          },
        });

        if (!branch) {
          throw new BadRequestException('Branch not found or access denied');
        }

        // If floorId provided, verify it belongs to the same branch
        if (data.floorId) {
          const floor = await tx.floor.findFirst({
            where: {
              id: data.floorId,
              branchId: data.branchId,
              tenantId,
              isDeleted: false,
            },
          });

          if (!floor) {
            throw new BadRequestException(
              'Floor not found or does not belong to this branch',
            );
          }
        }

        // Check for duplicate table number in the same branch
        const existingTable = await tx.table.findFirst({
          where: {
            branchId: data.branchId,
            tableNumber: data.tableNumber,
            isDeleted: false,
          },
        });

        if (existingTable) {
          throw new BadRequestException(
            `Table number ${data.tableNumber} already exists in this branch`,
          );
        }

        return tx.table.create({
          data: {
            tableNumber: data.tableNumber,
            name: data.name,
            capacity: data.capacity,
            tenantId,
            branchId: data.branchId,
            floorId: data.floorId,
          },
          include: {
            floor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });
    } catch (error) {
      this.handleError(error, 'create table');
    }
  }

  /**
   * Update an existing table with tenant scoping
   * Uses transaction to ensure data consistency
   */
  async updateTable(id: string, data: UpdateTableDto, tenantId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify table exists and belongs to tenant
        const existingTable = await tx.table.findFirst({
          where: {
            id,
            tenantId,
            isDeleted: false,
          },
        });

        if (!existingTable) {
          throw new NotFoundException('Table not found');
        }

        // If updating floorId, verify floor belongs to same branch
        if (data.floorId !== undefined && data.floorId !== null) {
          const floor = await tx.floor.findFirst({
            where: {
              id: data.floorId,
              branchId: existingTable.branchId,
              tenantId,
              isDeleted: false,
            },
          });

          if (!floor) {
            throw new BadRequestException(
              'Floor not found or does not belong to this branch',
            );
          }
        }

        // If updating table number, check for duplicates
        if (
          data.tableNumber &&
          data.tableNumber !== existingTable.tableNumber
        ) {
          const duplicateTable = await tx.table.findFirst({
            where: {
              branchId: existingTable.branchId,
              tableNumber: data.tableNumber,
              isDeleted: false,
              NOT: { id },
            },
          });

          if (duplicateTable) {
            throw new BadRequestException(
              `Table number ${data.tableNumber} already exists in this branch`,
            );
          }
        }

        return tx.table.update({
          where: { id },
          data: {
            tableNumber: data.tableNumber,
            name: data.name,
            capacity: data.capacity,
            floorId: data.floorId,
            isActive: data.isActive,
          },
          include: {
            floor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });
    } catch (error) {
      this.handleError(error, 'update table');
    }
  }

  /**
   * Update table status (AVAILABLE, OCCUPIED, RESERVED)
   * Uses TableStatusService for proper validation and consistency
   */
  async updateTableStatus(
    id: string,
    data: UpdateTableStatusDto,
    tenantId: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Use TableStatusService for validation and update
        await this.tableStatusService.updateTableStatus(
          id,
          data.status as TableStatus,
          tenantId,
          tx,
        );

        // Return updated table with floor info
        return this.getTableById(id, tenantId);
      });
    } catch (error) {
      this.handleError(error, 'update table status');
    }
  }

  async deleteTable(id: string, tenantId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify table exists and belongs to tenant
        const existingTable = await tx.table.findFirst({
          where: {
            id,
            tenantId,
            isDeleted: false,
          },
        });

        if (!existingTable) {
          throw new NotFoundException('Table not found');
        }

        // Check for active orders on this table
        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: id,
            status: {
              in: ['DRAFT', 'PENDING', 'CONFIRMED'],
            },
          },
        });

        if (activeOrdersCount > 0) {
          throw new BadRequestException(
            'Cannot delete table with active orders. Please complete or cancel all orders first.',
          );
        }

        return tx.table.update({
          where: { id },
          data: { isDeleted: true },
        });
      });
    } catch (error) {
      this.handleError(error, 'delete table');
    }
  }

  /**
   * Get table statistics by status for a branch
   */
  async getTableStats(branchId: string, tenantId: string) {
    const tables = await this.prisma.table.findMany({
      where: {
        branchId,
        tenantId,
        isDeleted: false,
        isActive: true,
      },
      select: {
        status: true,
      },
    });

    const stats = {
      total: tables.length,
      available: tables.filter((t) => t.status === 'AVAILABLE').length,
      occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
      reserved: tables.filter((t) => t.status === 'RESERVED').length,
    };

    return stats;
  }
}
