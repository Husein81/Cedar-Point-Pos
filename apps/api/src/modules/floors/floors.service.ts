import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateFloorDto, UpdateFloorDto } from '../tables/dto/tables.dto.js';

@Injectable()
export class FloorsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get all active floors for a branch with table counts
     */
    async getFloorsByBranch(branchId: string, tenantId: string) {
        return this.prisma.floor.findMany({
            where: {
                branchId,
                tenantId,
                isDeleted: false,
            },
            include: {
                _count: {
                    select: {
                        tables: {
                            where: { isDeleted: false },
                        },
                    },
                },
            },
            orderBy: { order: 'asc' },
        });
    }

    /**
     * Get a specific floor by ID (only if not deleted and belongs to tenant)
     */
    async getFloorById(id: string, tenantId: string) {
        const floor = await this.prisma.floor.findFirst({
            where: {
                id,
                tenantId,
                isDeleted: false,
            },
            include: {
                _count: {
                    select: {
                        tables: {
                            where: { isDeleted: false },
                        },
                    },
                },
            },
        });

        if (!floor) {
            throw new NotFoundException('Floor not found');
        }

        return floor;
    }

    /**
     * Get all tables for a specific floor
     */
    async getTablesByFloor(floorId: string, tenantId: string) {
        // First verify floor exists and belongs to tenant
        const floor = await this.prisma.floor.findFirst({
            where: {
                id: floorId,
                tenantId,
                isDeleted: false,
            },
        });

        if (!floor) {
            throw new NotFoundException('Floor not found');
        }

        return this.prisma.table.findMany({
            where: {
                floorId,
                tenantId,
                isDeleted: false,
            },
            orderBy: { tableNumber: 'asc' },
        });
    }

    /**
     * Create a new floor with tenant scoping
     */
    async createFloor(data: CreateFloorDto, tenantId: string) {
        try {
            // Verify branch belongs to tenant
            const branch = await this.prisma.branch.findFirst({
                where: {
                    id: data.branchId,
                    tenantId,
                    isDeleted: false,
                },
            });

            if (!branch) {
                throw new BadRequestException('Branch not found or access denied');
            }

            // Check for duplicate floor name in the same branch
            const existingFloor = await this.prisma.floor.findFirst({
                where: {
                    branchId: data.branchId,
                    name: data.name,
                    isDeleted: false,
                },
            });

            if (existingFloor) {
                throw new BadRequestException(
                    `Floor "${data.name}" already exists in this branch`,
                );
            }

            return this.prisma.floor.create({
                data: {
                    name: data.name,
                    order: data.order,
                    tenantId,
                    branchId: data.branchId,
                },
            });
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }
            console.error('Error creating floor:', error);
            throw new InternalServerErrorException(
                `Failed to create floor: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Update an existing floor with tenant scoping
     */
    async updateFloor(id: string, data: UpdateFloorDto, tenantId: string) {
        try {
            // Verify floor exists and belongs to tenant
            const existingFloor = await this.prisma.floor.findFirst({
                where: {
                    id,
                    tenantId,
                    isDeleted: false,
                },
            });

            if (!existingFloor) {
                throw new NotFoundException('Floor not found');
            }

            // If updating name, check for duplicates
            if (data.name && data.name !== existingFloor.name) {
                const duplicateFloor = await this.prisma.floor.findFirst({
                    where: {
                        branchId: existingFloor.branchId,
                        name: data.name,
                        isDeleted: false,
                        NOT: { id },
                    },
                });

                if (duplicateFloor) {
                    throw new BadRequestException(
                        `Floor "${data.name}" already exists in this branch`,
                    );
                }
            }

            return this.prisma.floor.update({
                where: { id },
                data: {
                    name: data.name,
                    order: data.order,
                },
            });
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }
            console.error('Error updating floor:', error);
            throw new InternalServerErrorException(
                `Failed to update floor: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Soft delete a floor and CASCADE DELETE all its tables
     * Business Rule: Cannot delete if any table has active orders
     * @throws NotFoundException if floor doesn't exist
     * @throws BadRequestException if floor has tables with active orders
     */
    async deleteFloor(id: string, tenantId: string) {
        try {
            return this.prisma.$transaction(async (tx) => {
                // 1. Verify floor exists and fetch tables with active orders
                const floor = await tx.floor.findFirst({
                    where: {
                        id,
                        tenantId,
                        isDeleted: false,
                    },
                    include: {
                        tables: {
                            where: { isDeleted: false },
                            include: {
                                orders: {
                                    where: {
                                        status: {
                                            in: [
                                                'DRAFT',
                                                'PENDING',
                                                'CONFIRMED',
                                                'IN_PROGRESS',
                                                'SENT_TO_KITCHEN',
                                                'READY',
                                            ],
                                        },
                                    },
                                    select: { id: true, orderNumber: true },
                                },
                            },
                        },
                    },
                });

                if (!floor) {
                    throw new NotFoundException('Floor not found');
                }

                // 2. Business Rule: Prevent deletion if any table has active orders
                const tablesWithActiveOrders = floor.tables.filter(
                    (table) => table.orders.length > 0,
                );

                if (tablesWithActiveOrders.length > 0) {
                    const tableNames = tablesWithActiveOrders
                        .map((t) => `"${t.name}"`)
                        .join(', ');
                    throw new BadRequestException(
                        `Cannot delete floor "${floor.name}": ${tablesWithActiveOrders.length} table(s) [${tableNames}] have active orders. Please complete or cancel orders first.`,
                    );
                }

                // 3. CASCADE DELETE: Soft delete all tables on this floor
                await tx.table.updateMany({
                    where: {
                        floorId: id,
                        isDeleted: false,
                    },
                    data: {
                        isDeleted: true,
                    },
                });

                // 4. Soft delete the floor
                return tx.floor.update({
                    where: { id },
                    data: {
                        isDeleted: true,
                    },
                });
            });
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            console.error('Error deleting floor:', error);
            throw new InternalServerErrorException(
                `Failed to delete floor: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
