import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller.js';
import { TaxService } from './tax.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [TaxController],
  providers: [TaxService],
})
export class TaxModule {}

