import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async getTaxesByTenant(tenantId: string) {
    return await this.prisma.tax.findMany({
      where: { tenantId },
    });
  }

  async getTaxesPaginated(tenantId: string, params: QueryParams) {
    try {
      const { search, sort, order } = params;
      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 10;

      const skip = (page - 1) * limit;
      const where: Prisma.TaxWhereInput = { tenantId };

      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ];
      }

      const orderBy: Prisma.TaxOrderByWithRelationInput = {};
      if (sort) {
        (orderBy as Record<string, any>)[sort] = order || 'asc';
      } else {
        orderBy.name = 'asc'; // Default sort by name
      }

      const [totalCount, data] = (await Promise.all([
        this.prisma.tax.count({ where }),
        this.prisma.tax.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
      ])) as [number, unknown[]];

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
      console.error('Error fetching paginated taxes:', error);
      throw new InternalServerErrorException('Failed to fetch taxes');
    }
  }

  async createTax(data: Prisma.TaxCreateInput) {
    try {
      return await this.prisma.tax.create({
        data,
      });
    } catch (error) {
      console.error('Error creating tax:', error);
      throw new InternalServerErrorException(
        `Failed to create tax: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateTax(id: string, data: Prisma.TaxUpdateInput) {
    try {
      const result = await this.prisma.tax.update({
        where: { id },
        data,
      });

      return result;
    } catch (error) {
      console.error('Error updating tax:', error);
      throw new InternalServerErrorException(
        `Failed to update tax: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteTax(id: string) {
    try {
      await this.prisma.tax.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting tax:', error);
      throw new InternalServerErrorException(
        `Failed to delete tax: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
