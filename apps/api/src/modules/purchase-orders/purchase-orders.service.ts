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
import type { QueryParams } from '@repo/types';

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

    // Calculate total amount from items using Decimal for precision
    const totalAmount = items.reduce(
      (sum, item) =>
        sum.plus(new Prisma.Decimal(item.quantity).times(item.unitCost)),
      new Prisma.Decimal(0),
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
              totalCost: new Prisma.Decimal(item.quantity).times(item.unitCost),
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
   * Get paginated list of purchase orders
   */
  async getPurchaseOrdersPaginated(
    tenantId: string,
    params: QueryParams & {
      status?: string;
      supplierId?: string;
      branchId?: string;
    },
  ) {
    const {
      search,
      sort,
      order,
      page: rawPage,
      limit: rawLimit,
      status,
      supplierId,
      branchId,
    } = params;

    const page = Math.max(Number(rawPage) || 1, 1);
    const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
      ...(supplierId && { supplierId }),
      ...(branchId && { branchId }),
      ...(status && { status: status as PurchaseOrderStatus }),
    };

    const searchTerm = search?.trim();
    if (searchTerm) {
      where.OR = [
        {
          orderNumber: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          supplier: {
            name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive },
          },
        },
        {
          supplier: {
            companyName: {
              contains: searchTerm,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      ];
    }

    const sortableFields: Record<string, true> = {
      orderedAt: true,
      totalAmount: true,
      status: true,
      orderNumber: true,
    };

    const sortField = sort && sortableFields[sort] ? sort : 'orderedAt';
    const sortOrder: Prisma.SortOrder = order === 'asc' ? 'asc' : 'desc';

    const [totalCount, data] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
        include: {
          supplier: {
            select: { id: true, name: true, companyName: true },
          },
          branch: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
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
        items: true,
        supplier: { select: { name: true } },
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

    const orderRef = purchaseOrder.orderNumber || id;
    const reason = `PO ${orderRef} from ${purchaseOrder.supplier.name}`;

    // Update inventory for each item
    for (const item of purchaseOrder.items) {
      await this.inventoryTransactionService.executeTransaction({
        tenantId,
        branchId: purchaseOrder.branchId,
        productId: item.productId,
        userId,
        changeType: 'PURCHASE_IN',
        quantity: Number(item.quantity),
        reason,
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
