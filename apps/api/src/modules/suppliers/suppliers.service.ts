import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { Prisma, PurchaseOrderStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search suppliers by name, company name, or phone (Simple search for autocomplete)
   */
  async searchSuppliers(tenantId: string, query?: string, limit?: number) {
    // If no query, return recent suppliers
    if (!query || query.trim().length === 0) {
      return this.prisma.supplier.findMany({
        where: { tenantId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: limit ?? 10,
        select: {
          id: true,
          name: true,
          companyName: true,
          phone: true,
          email: true,
        },
      });
    }

    const searchTerm = query.trim();

    // Search by name, company name, or phone (case-insensitive)
    return this.prisma.supplier.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { companyName: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: limit ?? 10,
      select: {
        id: true,
        name: true,
        companyName: true,
        phone: true,
        email: true,
      },
    });
  }

  /**
   * Get paginated list of suppliers with search support
   */
  async getSuppliersPaginated(tenantId: string, params: QueryParams) {
    try {
      const { search, sort, order, page: rawPage, limit: rawLimit } = params;

      const page = Math.max(Number(rawPage) || 1, 1);
      const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      const where: Prisma.SupplierWhereInput = {
        tenantId,
        isActive: true,
      };

      const searchTerm = search?.trim();
      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          { companyName: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          { phone: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          { category: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        ];
      }

      const sortableFields: Record<string, true> = {
        name: true,
        companyName: true,
        phone: true,
        email: true,
        category: true,
        currentBalance: true,
        createdAt: true,
        updatedAt: true,
      };

      const sortField = sort && sortableFields[sort] ? sort : 'createdAt';
      const sortOrder: Prisma.SortOrder =
        order === 'asc' || order === 'desc' ? order : 'desc';

      const orderBy: Prisma.SupplierOrderByWithRelationInput[] = [
        { [sortField]: sortOrder },
        { id: 'desc' },
      ];

      const [totalCount, data] = await this.prisma.$transaction([
        this.prisma.supplier.count({ where }),
        this.prisma.supplier.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: { purchaseOrders: true },
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
      console.error('Error fetching paginated suppliers:', error);
      throw new InternalServerErrorException('Failed to fetch suppliers');
    }
  }

  /**
   * Get a single supplier by ID with operational/financial stats
   */
  async getSupplier(tenantId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: supplierId,
        tenantId,
        isActive: true,
      },
      include: {
        purchaseOrders: {
          where: {
            status: { not: PurchaseOrderStatus.CANCELLED },
          },
          select: {
            id: true,
            totalAmount: true,
            orderedAt: true,
            receivedAt: true,
            status: true,
          },
          orderBy: { orderedAt: 'desc' },
        },
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Calculate operational/financial stats
    const completedOrders = supplier.purchaseOrders.filter(
      (po) => po.status === PurchaseOrderStatus.RECEIVED,
    );
    const totalPurchaseAmount = completedOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0,
    );
    const lastPurchaseOrder =
      supplier.purchaseOrders.length > 0 ? supplier.purchaseOrders[0] : null;
    const lastPurchaseDate = lastPurchaseOrder?.orderedAt ?? null;
    const lastPurchaseAmount = lastPurchaseOrder
      ? Number(lastPurchaseOrder.totalAmount)
      : null;

    return {
      id: supplier.id,
      name: supplier.name,
      companyName: supplier.companyName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      category: supplier.category,
      currentBalance: Number(supplier.currentBalance),
      notes: supplier.notes,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      // Operational stats
      totalOrders: supplier._count.purchaseOrders,
      totalPurchaseAmount: Math.round(totalPurchaseAmount * 100) / 100,
      lastPurchaseDate,
      lastPurchaseAmount:
        lastPurchaseAmount !== null
          ? Math.round(lastPurchaseAmount * 100) / 100
          : null,
    };
  }

  /**
   * Get paginated purchase orders for a specific supplier
   */
  async getSupplierPurchaseOrders(
    tenantId: string,
    supplierId: string,
    params: QueryParams,
  ) {
    // Verify supplier exists and belongs to tenant
    const supplierExists = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId, isActive: true },
      select: { id: true },
    });

    if (!supplierExists) {
      throw new NotFoundException('Supplier not found');
    }

    const { page: rawPage, limit: rawLimit } = params;

    const page = Math.max(Number(rawPage) || 1, 1);
    const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      supplierId,
    };

    const [totalCount, orders] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { orderedAt: 'desc' },
        skip,
        take: limit,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Create a new supplier
   */
  async createSupplier(
    tenantId: string,
    data: {
      name: string;
      companyName?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      category?: string | null;
      notes?: string | null;
    },
  ) {
    try {
      // Check for duplicate phone number within tenant (if provided)
      if (data.phone) {
        const existingSupplier = await this.prisma.supplier.findFirst({
          where: {
            tenantId,
            phone: data.phone,
            isActive: true,
          },
        });

        if (existingSupplier) {
          throw new BadRequestException(
            'A supplier with this phone number already exists',
          );
        }
      }

      const supplier = await this.prisma.supplier.create({
        data: {
          ...data,
          tenantId,
        },
      });

      return supplier;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error creating supplier:', error);
      throw new InternalServerErrorException('Failed to create supplier');
    }
  }

  /**
   * Update an existing supplier
   */
  async updateSupplier(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      companyName?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      category?: string | null;
      notes?: string | null;
      currentBalance?: number;
    },
  ) {
    try {
      // Verify supplier exists and belongs to tenant
      const existingSupplier = await this.prisma.supplier.findFirst({
        where: { id, tenantId, isActive: true },
      });

      if (!existingSupplier) {
        throw new NotFoundException('Supplier not found');
      }

      // Check for duplicate phone if phone is being updated
      if (data.phone && data.phone !== existingSupplier.phone) {
        const duplicatePhone = await this.prisma.supplier.findFirst({
          where: {
            tenantId,
            phone: data.phone,
            isActive: true,
            id: { not: id },
          },
        });

        if (duplicatePhone) {
          throw new BadRequestException(
            'A supplier with this phone number already exists',
          );
        }
      }

      const result = await this.prisma.supplier.update({
        where: { id },
        data,
      });
      return result;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Error updating supplier:', error);
      throw new InternalServerErrorException('Failed to update supplier');
    }
  }

  /**
   * Soft delete a supplier (set isActive to false)
   */
  async deleteSupplier(tenantId: string, id: string) {
    try {
      // Verify supplier exists and belongs to tenant
      const existingSupplier = await this.prisma.supplier.findFirst({
        where: { id, tenantId, isActive: true },
      });

      if (!existingSupplier) {
        throw new NotFoundException('Supplier not found');
      }

      // Soft delete by setting isActive to false
      const result = await this.prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error deleting supplier:', error);
      throw new InternalServerErrorException('Failed to delete supplier');
    }
  }
}
