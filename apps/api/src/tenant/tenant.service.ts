import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';

@Injectable()
export class TenantService {
  async getTenants() {
    return await prisma.tenant.findMany();
  }

  async createTenant(data: Prisma.TenantCreateInput) {
    try {
      const tenant = await prisma.tenant.create({
        data,
      });
      return tenant;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw new InternalServerErrorException(
        `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
