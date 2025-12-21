// Prisma config for tenant schema (per-tenant)
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/tenant.prisma',
  datasource: {
    url: process.env['DIRECT_URL'] || process.env['DATABASE_URL'],
  },
});
