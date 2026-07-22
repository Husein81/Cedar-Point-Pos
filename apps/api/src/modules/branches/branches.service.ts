import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async getBranches() {
    return await this.prisma.branch.findMany();
  }

  /**
   * Creates a branch for a tenant. Only called from SYSTEM_ADMIN routes —
   * branch creation is not tenant-self-service (see BranchesController).
   */
  async createBranch(data: Prisma.BranchCreateInput) {
    try {
      return await this.prisma.branch.create({ data });
    } catch (error) {
      console.error('Error creating branch:', error);
      throw new InternalServerErrorException(
        `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateBranch(id: string, data: Prisma.BranchUpdateInput) {
    try {
      const result = await this.prisma.branch.update({
        where: { id },
        data,
      });

      return result;
    } catch (error) {
      console.error('Error updating branch:', error);
      throw new InternalServerErrorException(
        `Failed to update branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteBranch(id: string) {
    try {
      await this.prisma.branch.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw new InternalServerErrorException(
        `Failed to delete branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getBranchById(id: string) {
    return await this.prisma.branch.findUnique({
      where: { id },
    });
  }

  async getBranchesByTenantId(tenantId: string) {
    return await this.prisma.branch.findMany({
      where: { tenantId },
    });
  }
}
