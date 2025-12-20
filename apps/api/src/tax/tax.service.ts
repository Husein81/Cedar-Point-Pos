/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
