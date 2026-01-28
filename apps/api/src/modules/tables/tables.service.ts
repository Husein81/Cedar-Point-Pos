import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}
  async getTablesByBranch(id: string) {
    return await this.prisma.table.findMany({
      where: {
        branchId: id,
      },
    });
  }

  async getTableById(id: string) {
    return await this.prisma.table.findUnique({
      where: {
        id,
      },
    });
  }

  async createTable(data: Prisma.TableCreateInput) {
    try {
      const result = await this.prisma.table.create({
        data,
      });
      return result;
    } catch (error) {
      console.error('Error creating table:', error);
      throw new InternalServerErrorException(
        `Failed to create table: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateTable(id: string, data: Prisma.TableUpdateInput) {
    try {
      const result = await this.prisma.table.update({
        where: { id },
        data,
      });
      return result;
    } catch (error) {
      console.error('Error updating table:', error);
      throw new InternalServerErrorException(
        `Failed to update table: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteTable(id: string) {
    try {
      await this.prisma.table.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting table:', error);
      throw new InternalServerErrorException(
        `Failed to delete table: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
