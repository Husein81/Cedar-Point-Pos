import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus, QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search customers by name or phone (Legacy / Simple search)
   */
  async searchCustomers(tenantId: string, query?: string, limit?: number) {
    // If no query, return recent customers
    if (!query || query.trim().length === 0) {
      return this.prisma.customer.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      });
    }

    const searchTerm = query.trim();

    // Search by name or phone (case-insensitive)
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });
  }

  async getCustomersPaginated(tenantId: string, params: QueryParams) {
    try {
      const { search, sort, order, page: rawPage, limit: rawLimit } = params;

      const page = Math.max(Number(rawPage) || 1, 1);
      const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      const where: Prisma.CustomerWhereInput = {
        tenantId,
      };

      const searchTerm = search?.trim();
      if (searchTerm) {
        where.OR = [
          {
            name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive },
          },
          {
            phone: { contains: searchTerm, mode: Prisma.QueryMode.insensitive },
          },
          {
            email: { contains: searchTerm, mode: Prisma.QueryMode.insensitive },
          },
        ];
      }

      const sortableFields: Record<string, true> = {
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      };

      const sortField = sort && sortableFields[sort] ? sort : 'createdAt';
      const sortOrder: Prisma.SortOrder =
        order === 'asc' || order === 'desc' ? order : 'desc';

      const orderBy: Prisma.CustomerOrderByWithRelationInput[] = [
        { [sortField]: sortOrder },
        { id: 'desc' },
      ];

      const [totalCount, data] = await this.prisma.$transaction([
        this.prisma.customer.count({ where }),
        this.prisma.customer.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: { orders: true },
            },
            loyaltyAccount: {
              select: {
                pointsBalance: true,
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
      console.error('Error fetching paginated customers:', error);
      throw new InternalServerErrorException('Failed to fetch customers');
    }
  }

  /**
   * Get a single customer by ID with operational stats
   */
  async getCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
      include: {
        orders: {
          where: {
            status: { not: OrderStatus.CANCELLED },
          },
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Calculate operational stats
    const completedOrders = customer.orders;
    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );
    const lastOrderAt =
      completedOrders.length > 0 ? completedOrders[0].createdAt : null;
    const averageOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Fetch loyalty account summary (returns zero-shape if no account)
    const loyaltyAccount = await this.prisma.loyaltyAccount.findUnique({
      where: {
        tenantId_customerId: { tenantId, customerId },
      },
      select: {
        pointsBalance: true,
        lifetimeEarned: true,
        lifetimeRedeemed: true,
        lifetimeRestored: true,
        lifetimeReversed: true,
        lifetimeAdjusted: true,
      },
    });

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      orderCount: customer._count.orders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      lastOrderAt,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      loyalty: loyaltyAccount
        ? {
            pointsBalance: loyaltyAccount.pointsBalance,
            lifetimeEarned: loyaltyAccount.lifetimeEarned,
            lifetimeRedeemed: loyaltyAccount.lifetimeRedeemed,
            lifetimeRestored: loyaltyAccount.lifetimeRestored,
            lifetimeReversed: loyaltyAccount.lifetimeReversed,
            lifetimeAdjusted: loyaltyAccount.lifetimeAdjusted,
          }
        : {
            pointsBalance: 0,
            lifetimeEarned: 0,
            lifetimeRedeemed: 0,
            lifetimeRestored: 0,
            lifetimeReversed: 0,
            lifetimeAdjusted: 0,
          },
    };
  }

  /**
   * Get paginated orders for a specific customer
   */
  async getCustomerOrders(
    tenantId: string,
    customerId: string,
    params: QueryParams,
  ) {
    const { page: rawPage, limit: rawLimit } = params;

    const page = Math.max(Number(rawPage) || 1, 1);
    const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      customerId,
    };

    const [totalCount, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          payments: {
            select: {
              id: true,
              method: true,
              amount: true,
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
   * Create a new customer
   */
  async createCustomer(
    tenantId: string,
    data: Omit<Prisma.CustomerCreateInput, 'tenantId' | 'tenant' | 'orders'>,
  ) {
    try {
      // Check for duplicate phone number within tenant
      if (data.phone) {
        const existingCustomer = await this.prisma.customer.findFirst({
          where: {
            tenantId,
            phone: data.phone,
          },
        });

        if (existingCustomer) {
          throw new BadRequestException(
            'A customer with this phone number already exists',
          );
        }
      }

      const customer = await this.prisma.customer.create({
        data: {
          ...data,
          tenantId,
        },
      });

      return customer;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error creating customer:', error);
      throw new InternalServerErrorException('Failed to create customer');
    }
  }

  async updateCustomer(id: string, data: Prisma.CustomerUpdateInput) {
    try {
      const result = await this.prisma.customer.update({
        where: { id },
        data,
      });
      return result;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw new InternalServerErrorException('Failed to update customer');
    }
  }

  async deleteCustomer(id: string) {
    try {
      const result = await this.prisma.customer.delete({
        where: { id },
      });
      return result;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw new InternalServerErrorException('Failed to delete customer');
    }
  }
}
