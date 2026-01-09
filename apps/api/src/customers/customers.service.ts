import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
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
   * Get a single customer by ID
   */
  async getCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      ...customer,
      orderCount: customer._count.orders,
      _count: undefined,
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
