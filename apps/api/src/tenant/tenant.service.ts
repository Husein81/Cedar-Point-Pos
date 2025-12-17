import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenants() {
    return await this.prisma.tenant.findMany();
  }

  async createTenant(data: Prisma.TenantCreateInput) {
    try {
      const tenant = await this.prisma.tenant.create({
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
