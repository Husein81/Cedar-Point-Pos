import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseOrderStatus } from '../../generated/prisma/client.js';
import { Prisma } from '../../generated/prisma/client.js';
import { InventoryTransactionService } from '../inventory/inventory-transaction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreatePurchaseOrderDto,
  PurchaseOrderItemDto,
} from './dto/create-purchase-order.dto.js';
import type { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto.js';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  /**
   * Create a new purchase order with items
   */
  async createPurchaseOrder(
    tenantId: string,
    userId: string,
    createDto: CreatePurchaseOrderDto,
  ) {
    const { supplierId, branchId, items, notes, orderNumber } = createDto;

    // Verify supplier exists and belongs to tenant
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId, deletedAt: null },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Verify branch exists and belongs to tenant
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Verify all products exist and belong to tenant
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
        deletedAt: null,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Calculate total amount from items
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    // Create purchase order with items in transaction
    const purchaseOrder = await this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          tenantId,
          branchId,
          supplierId,
          orderNumber,
          totalAmount,
          status: PurchaseOrderStatus.PENDING,
          notes,
          items: {
            create: items.map((item: PurchaseOrderItemDto) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  barcode: true,
                },
              },
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return po;
    });

    return purchaseOrder;
  }

  /**
   * Get a purchase order by ID with items
   */
  async getPurchaseOrder(tenantId: string, id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                cost: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return purchaseOrder;
  }

  /**
   * Update purchase order metadata (not items)
   */
  async updatePurchaseOrder(
    tenantId: string,
    id: string,
    updateDto: UpdatePurchaseOrderDto,
  ) {
    // Verify purchase order exists and belongs to tenant
    const existingPO = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!existingPO) {
      throw new NotFoundException('Purchase order not found');
    }

    // Prevent status changes if already completed or cancelled
    if (
      updateDto.status &&
      (existingPO.status === PurchaseOrderStatus.RECEIVED ||
        existingPO.status === PurchaseOrderStatus.CANCELLED)
    ) {
      throw new BadRequestException(
        'Cannot change status of received or cancelled purchase order',
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(updateDto.status && { status: updateDto.status }),
        ...(updateDto.orderNumber && { orderNumber: updateDto.orderNumber }),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Mark purchase order as received and update inventory
   */
  async receivePurchaseOrder(tenantId: string, userId: string, id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Purchase order already received');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot receive cancelled purchase order');
    }

    // Update inventory for each item
    for (const item of purchaseOrder.items) {
      const quantity = Number(item.quantity);

      await this.inventoryTransactionService.executeTransaction({
        tenantId,
        branchId: purchaseOrder.branchId,
        productId: item.productId,
        userId,
        changeType: 'REFUND', // Using REFUND to add stock
        quantity,
        reason: `Purchase Order ${id} received from ${purchaseOrder.supplierId}`,
        referenceId: id,
        referenceType: 'PURCHASE_ORDER',
        allowNegativeStock: false,
      });
    }

    // Update purchase order status
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.RECEIVED,
        receivedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Cancel a purchase order
   */
  async cancelPurchaseOrder(tenantId: string, id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Cannot cancel received purchase order');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Purchase order already cancelled');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updated;
  }
}
