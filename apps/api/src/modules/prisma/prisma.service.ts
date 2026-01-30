import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({
      adapter,
      transactionOptions: {
        maxWait: 30000, // 30 seconds max wait to start transaction
        timeout: 30000, // 30 seconds max time transaction can run
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
