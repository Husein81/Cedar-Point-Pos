import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';

@Injectable()
export class BranchesService {
  async getBranches() {
    return await prisma.branch.findMany();
  }

  async createBranch(data: Prisma.BranchCreateInput) {
    try {
      const result = await prisma.branch.create({
        data,
      });
      return result;
    } catch (error) {
      console.error('Error creating branch:', error);
      throw new InternalServerErrorException(
        `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateBranch(id: string, data: Prisma.BranchUpdateInput) {
    try {
      const result = await prisma.branch.update({
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
      await prisma.branch.delete({
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
    return await prisma.branch.findUnique({
      where: { id },
    });
  }

  async getBranchesByTenantId(tenantId: string) {
    return await prisma.branch.findMany({
      where: { tenantId },
    });
  }
}
