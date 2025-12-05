/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, prisma, TransferStatus } from '@repo/db';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';

@Injectable()
export class TransfersService {
  async create(
    tenantId: string,
    userId: string,
    createTransferDto: CreateTransferDto,
  ) {
    const { fromBranchId, toBranchId, items, notes } = createTransferDto;

    // Validate branches exist and belong to tenant
    const [fromBranch, toBranch] = await Promise.all([
      prisma.branch.findFirst({
        where: { id: fromBranchId, tenantId },
      }),
      prisma.branch.findFirst({
        where: { id: toBranchId, tenantId },
      }),
    ]);

    if (!fromBranch) {
      throw new NotFoundException('Source branch not found');
    }

    if (!toBranch) {
      throw new NotFoundException('Destination branch not found');
    }

    if (fromBranchId === toBranchId) {
      throw new BadRequestException('Cannot transfer to the same branch');
    }

    // Validate products and check stock availability
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Check stock availability in source branch
    const inventoryRecords = await prisma.inventory.findMany({
      where: {
        branchId: fromBranchId,
        productId: { in: productIds },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    const inventoryMap = new Map(
      inventoryRecords.map((inv) => [inv.productId, inv]),
    );

    const insufficientStock: Array<{
      productId: string;
      productName: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of items) {
      const inventory = inventoryMap.get(item.productId);

      if (!inventory) {
        insufficientStock.push({
          productId: item.productId,
          productName:
            products.find((p) => p.id === item.productId)?.name || 'Unknown',
          requested: item.quantity,
          available: 0,
        });
      } else if (Number(inventory.stock) < item.quantity) {
        insufficientStock.push({
          productId: item.productId,
          productName: inventory.product.name,
          requested: item.quantity,
          available: Number(inventory.stock),
        });
      }
    }

    if (insufficientStock.length > 0) {
      throw new BadRequestException({
        message: 'Insufficient stock for transfer',
        insufficientStock,
      });
    }

    // Create transfer with items in a transaction
    const transfer = await prisma.$transaction(async (tx) => {
      const newTransfer = await tx.transfer.create({
        data: {
          tenantId,
          fromBranchId,
          toBranchId,
          requestedBy: userId,
          status: TransferStatus.PENDING,
          notes,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: new Prisma.Decimal(item.quantity),
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
                },
              },
            },
          },
          fromBranch: {
            select: {
              id: true,
              name: true,
            },
          },
          toBranch: {
            select: {
              id: true,
              name: true,
            },
          },
          requestor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return newTransfer;
    });

    return this.formatTransfer(transfer);
  }

  /**
   * Complete a transfer and update inventory atomically
   * This moves stock from source to destination branch
   */
  async completeTransfer(tenantId: string, userId: string, transferId: string) {
    const transfer = await prisma.transfer.findFirst({
      where: {
        id: transferId,
        tenantId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new BadRequestException('Transfer already completed');
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete cancelled transfer');
    }

    // Validate stock is still available
    const inventoryRecords = await prisma.inventory.findMany({
      where: {
        branchId: transfer.fromBranchId,
        productId: { in: transfer.items.map((item) => item.productId) },
      },
    });

    const inventoryMap = new Map(
      inventoryRecords.map((inv) => [inv.productId, inv]),
    );

    const insufficientStock: Array<{
      productId: string;
      productName: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of transfer.items) {
      const inventory = inventoryMap.get(item.productId);
      const requestedQty = Number(item.quantity);

      if (!inventory || Number(inventory.stock) < requestedQty) {
        insufficientStock.push({
          productId: item.productId,
          productName: item.product.name,
          requested: requestedQty,
          available: inventory ? Number(inventory.stock) : 0,
        });
      }
    }

    if (insufficientStock.length > 0) {
      throw new BadRequestException({
        message: 'Insufficient stock to complete transfer',
        insufficientStock,
      });
    }

    // Execute transfer atomically
    const completedTransfer = await prisma.$transaction(async (tx) => {
      // Update inventory for each item
      for (const item of transfer.items) {
        const quantity = new Prisma.Decimal(item.quantity);

        // Deduct from source branch
        const sourceInventory = await tx.inventory.findUnique({
          where: {
            branchId_productId: {
              branchId: transfer.fromBranchId,
              productId: item.productId,
            },
          },
        });

        if (sourceInventory) {
          await tx.inventory.update({
            where: {
              id: sourceInventory.id,
            },
            data: {
              stock: {
                decrement: quantity,
              },
            },
          });
        }

        // Add to destination branch (create if not exists)
        const destInventory = await tx.inventory.findUnique({
          where: {
            branchId_productId: {
              branchId: transfer.toBranchId,
              productId: item.productId,
            },
          },
        });

        if (destInventory) {
          await tx.inventory.update({
            where: {
              id: destInventory.id,
            },
            data: {
              stock: {
                increment: quantity,
              },
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              tenantId,
              branchId: transfer.toBranchId,
              productId: item.productId,
              stock: quantity,
              minStock: new Prisma.Decimal(0),
            },
          });
        }
      }

      // Update transfer status
      return tx.transfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.COMPLETED,
          approvedBy: userId,
          completedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          fromBranch: {
            select: {
              id: true,
              name: true,
            },
          },
          toBranch: {
            select: {
              id: true,
              name: true,
            },
          },
          requestor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    return this.formatTransfer(completedTransfer);
  }

  /**
   * Cancel a pending transfer
   */
  async cancelTransfer(tenantId: string, transferId: string) {
    const transfer = await prisma.transfer.findFirst({
      where: {
        id: transferId,
        tenantId,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed transfer');
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new BadRequestException('Transfer already cancelled');
    }

    const updated = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.CANCELLED,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        fromBranch: {
          select: {
            id: true,
            name: true,
          },
        },
        toBranch: {
          select: {
            id: true,
            name: true,
          },
        },
        requestor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.formatTransfer(updated);
  }

  /**
   * Get all transfers with filters
   */
  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      status?: TransferStatus;
      fromBranchId?: string;
      toBranchId?: string;
    },
  ) {
    const { page = 1, limit = 10, status, fromBranchId, toBranchId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.TransferWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(fromBranchId && { fromBranchId }),
      ...(toBranchId && { toBranchId }),
    };

    const [totalCount, transfers] = await Promise.all([
      prisma.transfer.count({ where }),
      prisma.transfer.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          fromBranch: {
            select: {
              id: true,
              name: true,
            },
          },
          toBranch: {
            select: {
              id: true,
              name: true,
            },
          },
          requestor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: transfers.map((transfer) => this.formatTransfer(transfer)),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get a specific transfer by ID
   */
  async findOne(tenantId: string, id: string) {
    const transfer = await prisma.transfer.findFirst({
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
              },
            },
          },
        },
        fromBranch: {
          select: {
            id: true,
            name: true,
          },
        },
        toBranch: {
          select: {
            id: true,
            name: true,
          },
        },
        requestor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return this.formatTransfer(transfer);
  }

  /**
   * Update transfer status or notes
   */
  async update(
    tenantId: string,
    transferId: string,
    updateTransferDto: UpdateTransferDto,
  ) {
    const transfer = await prisma.transfer.findFirst({
      where: {
        id: transferId,
        tenantId,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    // Prevent status changes if already completed or cancelled
    if (
      updateTransferDto.status &&
      (transfer.status === TransferStatus.COMPLETED ||
        transfer.status === TransferStatus.CANCELLED)
    ) {
      throw new BadRequestException(
        'Cannot change status of completed or cancelled transfer',
      );
    }

    const updated = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        ...(updateTransferDto.status && { status: updateTransferDto.status }),
        ...(updateTransferDto.notes !== undefined && {
          notes: updateTransferDto.notes,
        }),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        fromBranch: {
          select: {
            id: true,
            name: true,
          },
        },
        toBranch: {
          select: {
            id: true,
            name: true,
          },
        },
        requestor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.formatTransfer(updated);
  }

  /**
   * Format transfer response with decimal conversions
   */
  private formatTransfer(transfer: any) {
    return {
      ...transfer,
      items: transfer.items.map((item: any) => ({
        ...item,
        quantity: Number(item.quantity),
      })),
    };
  }
}
