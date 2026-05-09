import 'dotenv/config';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';

/**
 * Default currencies for the global reference table
 * These are commonly used currencies, especially for Lebanon markets
 */
const defaultCurrencies = [
  {
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    decimalPlaces: 2,
  },
  {
    code: 'LBP',
    name: 'Lebanese Pound',
    symbol: 'ل.ل',
    decimalPlaces: 0, // LBP doesn't use decimals
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
  },
  {
    code: 'GBP',
    name: 'British Pound Sterling',
    symbol: '£',
    decimalPlaces: 2,
  },
  {
    code: 'AED',
    name: 'United Arab Emirates Dirham',
    symbol: 'د.إ',
    decimalPlaces: 2,
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: '﷼',
    decimalPlaces: 2,
  },
  {
    code: 'JOD',
    name: 'Jordanian Dinar',
    symbol: 'د.ا',
    decimalPlaces: 3, // JOD uses 3 decimal places
  },
  {
    code: 'EGP',
    name: 'Egyptian Pound',
    symbol: 'E£',
    decimalPlaces: 2,
  },
  {
    code: 'SYP',
    name: 'Syrian Pound',
    symbol: 'ل.س',
    decimalPlaces: 0,
  },
  {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    decimalPlaces: 2,
  },
];

const defaultColors = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Yellow', hex: '#F59E0B' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Gray', hex: '#6B7280' },
];

export class Seeder {
  constructor(private readonly prisma: PrismaService) {}

  async seedCurrencies() {
    console.log('🌱 Seeding currencies...');

    for (const currency of defaultCurrencies) {
      await this.prisma.currency.upsert({
        where: { code: currency.code },
        update: {
          name: currency.name,
          symbol: currency.symbol,
          decimalPlaces: currency.decimalPlaces,
        },
        create: currency,
      });
      console.log(`  ✓ ${currency.code} - ${currency.name}`);
    }

    console.log('✅ Currencies seeded successfully!');
  }

  async seedColors() {
    console.log('Seeding default colors...');

    // Get or create a default tenant to assign colors to
    let tenant = await this.prisma.tenant.findFirst();

    if (!tenant) {
      console.log('  ! No tenant found, creating "Default Tenant"...');
      tenant = await this.prisma.tenant.create({
        data: {
          name: 'Default Tenant',
          businessType: 'RETAIL',
        },
      });
    }

    for (const color of defaultColors) {
      await this.prisma.color.upsert({
        where: {
          tenantId_hex: {
            tenantId: tenant.id,
            hex: color.hex,
          },
        },
        update: {
          name: color.name,
        },
        create: {
          ...color,
          tenantId: tenant.id,
        },
      });
      console.log(`  ✓ ${color.name} (${color.hex})`);
    }

    console.log('✅ Colors seeded successfully!');
  }

  async main(): Promise<void> {
    try {
      await this.seedCurrencies();
      await this.seedColors();
    } catch (error) {
      console.error('❌ Seed failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}
const seeder = new Seeder(new PrismaService());
await seeder.main();
