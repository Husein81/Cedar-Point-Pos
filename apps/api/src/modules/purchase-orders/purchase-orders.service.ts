import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PurchaseOrderItemType,
  PurchaseOrderStatus,
} from '../../generated/prisma/client.js';
import { InventoryTransactionService } from '../inventory/inventory-transaction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import type {
  AddPurchaseOrderItemDto,
  PurchaseOrderItemInputDto,
  UpdatePurchaseOrderItemDto,
} from './dto/purchase-order-item.dto.js';
import type { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto.js';

const purchaseOrderProductSelect = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
} as const;

const purchaseOrderSupplierSelect = {
  id: true,
  name: true,
  companyName: true,
} as const;

const purchaseOrderBranchSelect = {
  id: true,
  name: true,
} as const;

const purchaseOrderItemInclude = {
  product: {
    select: purchaseOrderProductSelect,
  },
} as const;

const purchaseOrderInclude = {
  items: {
    include: purchaseOrderItemInclude,
  },
  supplier: {
    select: purchaseOrderSupplierSelect,
  },
  branch: {
    select: purchaseOrderBranchSelect,
  },
} as const;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  /**
   * Create a new purchase order with items.
   */
  async createPurchaseOrder(
    tenantId: string,
    _userId: string,
    createDto: CreatePurchaseOrderDto,
  ) {
    const { supplierId, branchId, items, notes, orderNumber } = createDto;

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId, isActive: true },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const productsById = await this.getProductsByIds(
      tenantId,
      items
        .filter((item) => item.itemType === 'PRODUCT')
        .map((item) => item.productId),
    );

    const totalAmount = items.reduce(
      (sum, item) =>
        sum.add(
          new Prisma.Decimal(item.quantity).mul(
            new Prisma.Decimal(item.unitCost),
          ),
        ),
      new Prisma.Decimal(0),
    );

    const generatedOrderNumber =
      orderNumber?.trim() || `PO-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId,
        supplierId,
        orderNumber: generatedOrderNumber,
        totalAmount,
        status: PurchaseOrderStatus.PENDING,
        notes,
        items: {
          create: items.map((item) =>
            this.toPurchaseOrderItemCreateInput(item, productsById),
          ),
        },
      },
      include: purchaseOrderInclude,
    });
  }

  /**
   * Get a purchase order by ID with items.
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
                ...purchaseOrderProductSelect,
                cost: true,
              },
            },
          },
        },
        supplier: {
          select: {
            ...purchaseOrderSupplierSelect,
            phone: true,
            email: true,
          },
        },
        branch: {
          select: purchaseOrderBranchSelect,
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return purchaseOrder;
  }

  /**
   * Update purchase order metadata (notes, orderNumber only).
   */
  async updatePurchaseOrder(
    tenantId: string,
    id: string,
    updateDto: UpdatePurchaseOrderDto,
  ) {
    const existingPO = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!existingPO) {
      throw new NotFoundException('Purchase order not found');
    }

    if (
      existingPO.status === PurchaseOrderStatus.RECEIVED ||
      existingPO.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot update received or cancelled purchase order',
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(updateDto.orderNumber !== undefined && {
          orderNumber: updateDto.orderNumber,
        }),
      },
      include: purchaseOrderInclude,
    });
  }

  /**
   * Transition purchase order from PENDING -> ORDERED.
   */
  async orderPurchaseOrder(tenantId: string, id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot mark as ordered: current status is ${purchaseOrder.status}, expected PENDING`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.ORDERED,
        orderedAt: new Date(),
      },
      include: purchaseOrderInclude,
    });
  }

  /**
   * Mark purchase order as received and update inventory atomically.
   * Only PRODUCT items affect inventory.
   */
  async receivePurchaseOrder(tenantId: string, userId: string, id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== PurchaseOrderStatus.ORDERED) {
      throw new BadRequestException(
        `Cannot receive: current status is ${purchaseOrder.status}, expected ORDERED`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        for (const item of purchaseOrder.items) {
          if (
            item.itemType !== PurchaseOrderItemType.PRODUCT ||
            !item.productId
          ) {
            continue;
          }

          await this.inventoryTransactionService.executeTransactionInTx(tx, {
            tenantId,
            branchId: purchaseOrder.branchId,
            productId: item.productId,
            userId,
            changeType: 'PURCHASE_ORDER_RECEIVE',
            quantity: Number(item.quantity),
            reason: `Purchase Order ${id} received`,
            referenceId: id,
            referenceType: 'PURCHASE_ORDER',
            allowNegativeStock: false,
          });
        }

        return tx.purchaseOrder.update({
          where: { id },
          data: {
            status: PurchaseOrderStatus.RECEIVED,
            receivedAt: new Date(),
          },
          include: purchaseOrderInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
      },
    );
  }

  /**
   * Cancel a purchase order.
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

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
      },
      include: purchaseOrderInclude,
    });
  }

  /**
   * Get paginated list of purchase orders.
   */
  async getPurchaseOrdersPaginated(
    tenantId: string,
    query: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      supplierId?: string;
      branchId?: string;
    },
  ) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = { tenantId };

    if (query.status) {
      where.status = query.status as PurchaseOrderStatus;
    }
    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }
    if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        {
          supplier: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: purchaseOrderSupplierSelect },
          branch: { select: purchaseOrderBranchSelect },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
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
   * Add an item to an existing purchase order (PENDING only).
   */
  async addPurchaseOrderItem(
    tenantId: string,
    purchaseOrderId: string,
    dto: AddPurchaseOrderItemDto,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException(
        'Can only add items to PENDING purchase orders',
      );
    }

    if (dto.itemType === 'PRODUCT') {
      const existingProductItem = await this.prisma.purchaseOrderItem.findFirst(
        {
          where: {
            purchaseOrderId,
            productId: dto.productId,
          },
        },
      );

      if (existingProductItem) {
        throw new BadRequestException(
          'This product already exists in the purchase order',
        );
      }
    }

    const productsById = await this.getProductsByIds(
      tenantId,
      dto.itemType === 'PRODUCT' ? [dto.productId] : [],
    );

    const item = await this.prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId,
        ...this.toPurchaseOrderItemCreateInput(dto, productsById),
      },
      include: purchaseOrderItemInclude,
    });

    await this.recalculateTotalAmount(purchaseOrderId);

    return item;
  }

  /**
   * Update an item in a purchase order (PENDING only).
   */
  async updatePurchaseOrderItem(
    tenantId: string,
    purchaseOrderId: string,
    itemId: string,
    dto: UpdatePurchaseOrderItemDto,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException(
        'Can only update items on PENDING purchase orders',
      );
    }

    const existingItem = await this.prisma.purchaseOrderItem.findFirst({
      where: { id: itemId, purchaseOrderId },
    });

    if (!existingItem) {
      throw new NotFoundException('Purchase order item not found');
    }

    const quantity = dto.quantity ?? Number(existingItem.quantity);
    const unitCost = dto.unitCost ?? Number(existingItem.unitCost);
    const totalCost = new Prisma.Decimal(quantity).mul(
      new Prisma.Decimal(unitCost),
    );

    if (dto.itemType === 'PRODUCT') {
      const productId = dto.productId ?? existingItem.productId;
      if (!productId) {
        throw new BadRequestException(
          'Product ID is required for PRODUCT items',
        );
      }

      const duplicateProductItem =
        await this.prisma.purchaseOrderItem.findFirst({
          where: {
            purchaseOrderId,
            productId,
            id: { not: itemId },
          },
        });
      if (duplicateProductItem) {
        throw new BadRequestException(
          'This product already exists in the purchase order',
        );
      }

      const productsById = await this.getProductsByIds(tenantId, [productId]);
      const product = productsById.get(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const updated = await this.prisma.purchaseOrderItem.update({
        where: { id: itemId },
        data: {
          itemType: PurchaseOrderItemType.PRODUCT,
          productId,
          itemName:
            dto.itemName?.trim() || existingItem.itemName || product.name,
          quantity: new Prisma.Decimal(quantity),
          unitCost: new Prisma.Decimal(unitCost),
          totalCost,
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: purchaseOrderItemInclude,
      });

      await this.recalculateTotalAmount(purchaseOrderId);
      return updated;
    }

    const itemName =
      dto.itemName?.trim() ||
      (existingItem.itemType === PurchaseOrderItemType.CUSTOM
        ? existingItem.itemName
        : undefined);

    if (!itemName) {
      throw new BadRequestException('Item name is required for CUSTOM items');
    }

    const updated = await this.prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: {
        itemType: PurchaseOrderItemType.CUSTOM,
        productId: null,
        itemName,
        quantity: new Prisma.Decimal(quantity),
        unitCost: new Prisma.Decimal(unitCost),
        totalCost,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: purchaseOrderItemInclude,
    });

    await this.recalculateTotalAmount(purchaseOrderId);
    return updated;
  }

  /**
   * Remove an item from a purchase order (PENDING only).
   */
  async removePurchaseOrderItem(
    tenantId: string,
    purchaseOrderId: string,
    itemId: string,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException(
        'Can only remove items from PENDING purchase orders',
      );
    }

    const existingItem = await this.prisma.purchaseOrderItem.findFirst({
      where: { id: itemId, purchaseOrderId },
    });

    if (!existingItem) {
      throw new NotFoundException('Purchase order item not found');
    }

    await this.prisma.purchaseOrderItem.delete({
      where: { id: itemId },
    });

    await this.recalculateTotalAmount(purchaseOrderId);
  }

  /**
   * Delete a purchase order (PENDING only).
   */
  async deletePurchaseOrder(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Can only delete PENDING purchase orders');
    }

    await this.prisma.$transaction([
      this.prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      }),
      this.prisma.purchaseOrder.delete({
        where: { id },
      }),
    ]);
  }

  /**
   * Recalculate totalAmount from item totals.
   */
  private async recalculateTotalAmount(purchaseOrderId: string) {
    const result = await this.prisma.purchaseOrderItem.aggregate({
      where: { purchaseOrderId },
      _sum: { totalCost: true },
    });

    await this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        totalAmount: result._sum.totalCost ?? new Prisma.Decimal(0),
      },
    });
  }

  private async getProductsByIds(tenantId: string, productIds: string[]) {
    const uniqueProductIds = [...new Set(productIds)];

    if (uniqueProductIds.length === 0) {
      return new Map<string, { id: string; name: string }>();
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        tenantId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    return new Map(products.map((product) => [product.id, product]));
  }

  private toPurchaseOrderItemCreateInput(
    item: PurchaseOrderItemInputDto,
    productsById: Map<string, { id: string; name: string }>,
  ): Prisma.PurchaseOrderItemUncheckedCreateWithoutPurchaseOrderInput {
    const quantity = new Prisma.Decimal(item.quantity);
    const unitCost = new Prisma.Decimal(item.unitCost);
    const totalCost = quantity.mul(unitCost);

    if (item.itemType === 'PRODUCT') {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      return {
        itemType: PurchaseOrderItemType.PRODUCT,
        productId: item.productId,
        itemName: item.itemName?.trim() || product.name,
        quantity,
        unitCost,
        totalCost,
        notes: item.notes,
      };
    }

    return {
      itemType: PurchaseOrderItemType.CUSTOM,
      productId: null,
      itemName: item.itemName.trim(),
      quantity,
      unitCost,
      totalCost,
      notes: item.notes,
    };
  }
}
