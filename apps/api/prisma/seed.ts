import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

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

async function seedCurrencies() {
  console.log('🌱 Seeding currencies...');

  for (const currency of defaultCurrencies) {
    await prisma.currency.upsert({
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

async function main() {
  try {
    await seedCurrencies();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
