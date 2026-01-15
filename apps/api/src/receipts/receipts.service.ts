import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReceiptDataDto } from './dto/receipt-data.dto.js';

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  LBP: 'ل.ل',
  AED: 'د.إ',
  SAR: '﷼',
};

// Default decimal places per currency
const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  LBP: 0, // Lebanese Pound has no decimal places
  AED: 2,
  SAR: 2,
};

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get receipt data for an order
   *
   * This method fetches all necessary data for rendering a receipt
   * and formats it into a flat, display-ready structure.
   */
  async getReceiptData(
    tenantId: string,
    orderId: string,
    isReprint = false,
  ): Promise<ReceiptDataDto> {
    // Fetch order with all related data
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            businessType: true,
            baseCurrencyCode: true,
            settings: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        table: {
          select: {
            id: true,
            name: true,
            tableNumber: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            modifiers: {
              include: {
                modifier: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          include: {
            currency: {
              select: {
                code: true,
                symbol: true,
                decimalPlaces: true,
              },
            },
          },
          orderBy: {
            paidAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Calculate totals
    const subtotal = Number(order.subtotal);
    const discount = Number(order.discount || 0);
    const shippingFee = Number(order.shippingFee || 0);
    const total = Number(order.total);

    // Calculate total paid and change
    let totalPaid = 0;
    let cashPaid = 0;

    for (const payment of order.payments) {
      const amount = Number(payment.amount);
      const exchangeRate = payment.exchangeRate
        ? Number(payment.exchangeRate)
        : 1;
      const amountInBase = amount / exchangeRate;

      totalPaid += amountInBase;

      if (payment.method === 'CASH') {
        cashPaid += amount; // Keep in original currency for change calculation
      }
    }

    const balance = Math.max(0, total - totalPaid);
    const change = cashPaid > total ? cashPaid - total : 0;

    // Get base currency info
    const baseCurrencyCode = order.tenant.baseCurrencyCode || 'USD';
    const baseCurrencySymbol =
      CURRENCY_SYMBOLS[baseCurrencyCode] || baseCurrencyCode;
    const decimalPlaces = CURRENCY_DECIMALS[baseCurrencyCode] ?? 2;

    // Parse tenant settings for footer text
    const settings = order.tenant.settings as Record<string, unknown> | null;
    const footerText = (settings?.receiptFooterText as string) || null;
    const thankYouMessage =
      (settings?.thankYouMessage as string) || 'Thank you for your purchase!';

    // Build receipt data
    const receiptData: ReceiptDataDto = {
      // Metadata
      receiptId: `RCP-${order.id.slice(-8).toUpperCase()}`,
      isReprint,
      printedAt: new Date().toISOString(),
      printCount: isReprint ? 2 : 1, // TODO: Track actual print count in DB

      // Business Info
      tenant: {
        name: order.tenant.name,
        address: null, // TODO: Add to Tenant model if needed
        phone: null, // TODO: Add to Tenant model if needed
        logoUrl: null, // TODO: Add to Tenant model if needed
        businessType: order.tenant.businessType,
      },
      branch: {
        name: order.branch.name,
        address: order.branch.address,
        phone: order.branch.phone,
      },

      // Order Details
      order: {
        id: order.id,
        orderNumber: order.orderNumber || order.id.slice(-6).toUpperCase(),
        type: order.type,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        completedAt: order.completedAt?.toISOString() || null,
        tableNumber: order.table?.tableNumber || null,
        tableName: order.table?.name || null,
      },

      // Cashier
      cashier: order.user
        ? {
            id: order.user.id,
            name: order.user.name,
          }
        : null,

      // Customer
      customer: order.customer
        ? {
            id: order.customer.id,
            name: order.customer.name,
            phone: order.customer.phone,
            address: order.customer.address,
          }
        : null,

      // Items
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        notes: item.notes,
        modifiers: item.modifiers.map((mod) => ({
          name: mod.modifier.name,
          price: Number(mod.price),
        })),
      })),

      // Totals
      totals: {
        subtotal: this.round(subtotal),
        discount: this.round(discount),
        discountPercentage:
          subtotal > 0 ? this.round((discount / subtotal) * 100) : null,
        shippingFee: this.round(shippingFee),
        tax: 0, // TODO: Implement tax calculation
        total: this.round(total),
        totalPaid: this.round(totalPaid),
        change: this.round(change),
        balance: this.round(balance),
      },

      // Payments
      payments: order.payments.map((payment) => {
        const currencyCode = payment.currencyCode || baseCurrencyCode;
        const exchangeRate = payment.exchangeRate
          ? Number(payment.exchangeRate)
          : 1;
        const amount = Number(payment.amount);

        return {
          id: payment.id,
          method: payment.method,
          amount: this.round(amount),
          currencyCode,
          currencySymbol:
            payment.currency?.symbol ||
            CURRENCY_SYMBOLS[currencyCode] ||
            currencyCode,
          exchangeRate,
          amountInBaseCurrency: this.round(amount / exchangeRate),
          paidAt: payment.paidAt.toISOString(),
        };
      }),

      // Currency
      currency: {
        baseCurrencyCode,
        baseCurrencySymbol,
        decimalPlaces,
      },

      // Footer
      footer: {
        thankYouMessage,
        footerText,
      },
    };

    return receiptData;
  }

  /**
   * Check if an order can have a receipt printed
   */
  async canPrintReceipt(tenantId: string, orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      select: {
        status: true,
        items: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!order) return false;

    // Can print if order has items and is not cancelled/draft
    const printableStatuses = [
      'PENDING',
      'CONFIRMED',
      'IN_PROGRESS',
      'SENT_TO_KITCHEN',
      'READY',
      'PAID',
      'COMPLETED',
    ];

    return printableStatuses.includes(order.status) && order.items.length > 0;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
