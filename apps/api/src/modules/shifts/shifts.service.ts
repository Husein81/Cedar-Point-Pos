import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PaymentMethod } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { OpenShiftDto } from './dto/open-shift.dto.js';
import type { CreateCashMovementDto } from './dto/cash-movement.dto.js';
import type {
  ClosePreviewDto,
  CloseShiftDto,
  ApproveCloseDto,
} from './dto/close-shift.dto.js';
import {
  ShiftStatus,
  ShiftCloseMode,
  ShiftCloseResult,
  CashMovementType,
  CashMovementReferenceType,
  UserRole,
} from '@repo/types';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Open a new shift for a specific device.
   * Enforces one open shift per device using a Serializable transaction.
   */
  async openShift(tenantId: string, userId: string, dto: OpenShiftDto) {
    const { branchId, deviceId, startCash } = dto;

    return this.prisma.$transaction(
      async (tx) => {
        // Validate branch belongs to tenant
        const branch = await tx.branch.findFirst({
          where: { id: branchId, tenantId, isDeleted: false },
        });
        if (!branch) {
          throw new NotFoundException('Branch not found or not accessible');
        }

        // Validate device belongs to tenant and branch
        const device = await tx.pOSDevice.findFirst({
          where: { id: deviceId, tenantId, branchId, isActive: true },
        });
        if (!device) {
          throw new NotFoundException(
            'Device not found or not active in this branch',
          );
        }

        // Enforce one open shift per device
        const existingOpenShift = await tx.shift.findFirst({
          where: {
            tenantId,
            deviceId,
            status: ShiftStatus.OPEN,
          },
        });

        if (existingOpenShift) {
          throw new ConflictException({
            message: 'Device already has an open shift',
            code: 'DEVICE_HAS_OPEN_SHIFT',
            shiftId: existingOpenShift.id,
          });
        }

        // Create the shift
        const shift = await tx.shift.create({
          data: {
            tenantId,
            branchId,
            userId,
            deviceId,
            startCash,
            status: ShiftStatus.OPEN,
          },
          include: {
            branch: { select: { id: true, name: true } },
            device: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
          },
        });

        // Create opening cash movement
        if (startCash > 0) {
          await tx.cashMovement.create({
            data: {
              tenantId,
              branchId,
              shiftId: shift.id,
              deviceId,
              userId,
              type: CashMovementType.OPENING_CASH,
              amount: startCash,
              reason: 'Shift opening cash',
              referenceType: CashMovementReferenceType.SHIFT,
              referenceId: shift.id,
            },
          });
        }

        return shift;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Get the current open shift for a device (or user's tenant).
   * Scoped by tenantId, optionally filtered by deviceId and branchId.
   */
  async getCurrentShift(
    tenantId: string,
    deviceId?: string,
    branchId?: string,
  ) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        tenantId,
        status: ShiftStatus.OPEN,
        ...(deviceId && { deviceId }),
        ...(branchId && { branchId }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        device: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        cashMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { startTime: 'desc' },
    });

    if (!shift) {
      return null;
    }

    return shift;
  }

  /**
   * Create a manual cash movement (CASH_IN or CASH_OUT) for a shift.
   * Only allowed on open shifts.
   */
  async createCashMovement(
    tenantId: string,
    userId: string,
    shiftId: string,
    dto: CreateCashMovementDto,
  ) {
    const { type, amount, reason, idempotencyKey } = dto;

    // Check idempotency (tenant-scoped)
    if (idempotencyKey) {
      const existing = await this.prisma.cashMovement.findFirst({
        where: { tenantId, idempotencyKey },
      });
      if (existing) {
        return existing; // Return existing, don't create duplicate
      }
    }

    // Validate shift
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException(
        'Cannot add cash movements to a closed shift',
      );
    }

    // Create the cash movement
    const cashMovement = await this.prisma.cashMovement.create({
      data: {
        tenantId,
        branchId: shift.branchId,
        shiftId,
        deviceId: shift.deviceId,
        userId,
        type,
        amount,
        reason: reason || null,
        referenceType: CashMovementReferenceType.MANUAL,
        ...(idempotencyKey && { idempotencyKey }),
      },
    });

    return cashMovement;
  }

  /**
   * Get shift by ID with tenant scoping.
   */
  async findOne(tenantId: string, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
      include: {
        branch: { select: { id: true, name: true } },
        device: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        cashMovements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  // ── Variance thresholds (defaults; could be moved to tenant settings) ──
  private static readonly VARIANCE_WARNING_PERCENT = 2; // 2%
  private static readonly VARIANCE_APPROVAL_REQUIRED_PERCENT = 5; // 5%

  /**
   * Compute expected cash for a shift from the cash movement ledger.
   *
   * Expected = startCash
   *   + CASH_SALE + CASH_IN + CASH_REFUND_CORRECTION
   *   - CASH_CHANGE - CASH_OUT - CASH_REFUND_OUT
   *
   * OPENING_CASH is NOT added because startCash already represents it.
   */
  private async computeExpectedCash(
    shiftId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    expectedCash: number;
    cashBreakdown: Record<string, number>;
    startCash: number;
  }> {
    const client = tx ?? this.prisma;

    const shift = await client.shift.findUnique({
      where: { id: shiftId },
      select: { startCash: true },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const startCash = Number(shift.startCash);

    // Aggregate all cash movement types for this shift
    const movements = await client.cashMovement.groupBy({
      by: ['type'],
      where: { shiftId },
      _sum: { amount: true },
    });

    const breakdown: Record<string, number> = {};
    for (const m of movements) {
      breakdown[m.type] = Number(m._sum.amount ?? 0);
    }

    const cashSales = breakdown[CashMovementType.CASH_SALE] ?? 0;
    const cashIn = breakdown[CashMovementType.CASH_IN] ?? 0;
    const cashRefundCorrection =
      breakdown[CashMovementType.CASH_REFUND_CORRECTION] ?? 0;
    const cashChange = breakdown[CashMovementType.CASH_CHANGE] ?? 0;
    const cashOut = breakdown[CashMovementType.CASH_OUT] ?? 0;
    const cashRefundOut = breakdown[CashMovementType.CASH_REFUND_OUT] ?? 0;

    const expectedCash = this.money(
      startCash +
        cashSales +
        cashIn +
        cashRefundCorrection -
        cashChange -
        cashOut -
        cashRefundOut,
    );

    return { expectedCash, cashBreakdown: breakdown, startCash };
  }

  /**
   * Build payment method summary rows for a shift.
   * Returns per-method sales/refunds breakdown.
   */
  private async buildPaymentSummary(
    shiftId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    // Sales by method
    const salesByMethod = await client.payment.groupBy({
      by: ['method'],
      where: { shiftId },
      _count: true,
      _sum: { amount: true },
    });

    // Refunds by method
    const refundsByMethod = await client.refundPayment.groupBy({
      by: ['method'],
      where: { shiftId },
      _count: true,
      _sum: { amount: true },
    });

    const methods = new Set<PaymentMethod>();
    const salesMap = new Map<string, { count: number; total: number }>();
    const refundsMap = new Map<string, { count: number; total: number }>();

    for (const s of salesByMethod) {
      methods.add(s.method);
      salesMap.set(s.method, {
        count: s._count,
        total: Number(s._sum.amount ?? 0),
      });
    }

    for (const r of refundsByMethod) {
      methods.add(r.method);
      refundsMap.set(r.method, {
        count: r._count,
        total: Number(r._sum.amount ?? 0),
      });
    }

    return Array.from(methods).map((method) => {
      const sales = salesMap.get(method) ?? { count: 0, total: 0 };
      const refunds = refundsMap.get(method) ?? { count: 0, total: 0 };
      return {
        method,
        salesCount: sales.count,
        salesTotal: this.money(sales.total),
        refundsCount: refunds.count,
        refundsTotal: this.money(refunds.total),
        netTotal: this.money(sales.total - refunds.total),
      };
    });
  }

  /**
   * Build full Z-report snapshot payload for a shift.
   */
  private async buildZReportPayload(
    shiftId: string,
    tenantId: string,
    expectedCash: number,
    countedCash: number,
    varianceAmount: number,
    paymentSummary: Array<{
      method: string;
      salesCount: number;
      salesTotal: number;
      refundsCount: number;
      refundsTotal: number;
      netTotal: number;
    }>,
    cashBreakdown: Record<string, number>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    const shift = await client.shift.findUnique({
      where: { id: shiftId },
      select: {
        startTime: true,
        endTime: true,
        startCash: true,
        branchId: true,
        deviceId: true,
        userId: true,
        branch: { select: { name: true } },
        device: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    // Order counts
    const orderCounts = await client.order.groupBy({
      by: ['status'],
      where: { shiftId },
      _count: true,
    });

    // Total refunds
    const refundAgg = await client.refund.aggregate({
      where: { shiftId },
      _count: true,
      _sum: { totalAmount: true },
    });

    const totalSales = paymentSummary.reduce((s, p) => s + p.salesTotal, 0);
    const totalRefunds = paymentSummary.reduce((s, p) => s + p.refundsTotal, 0);

    return {
      shiftId,
      tenantId,
      branchId: shift?.branchId,
      branchName: shift?.branch?.name,
      deviceId: shift?.deviceId,
      deviceName: shift?.device?.name,
      userId: shift?.userId,
      userName: shift?.user?.name,
      startTime: shift?.startTime?.toISOString(),
      endTime: shift?.endTime?.toISOString() ?? new Date().toISOString(),
      startCash: Number(shift?.startCash ?? 0),
      expectedCash,
      countedCash,
      varianceAmount,
      cashBreakdown,
      paymentSummary,
      orders: {
        byStatus: orderCounts.map((o) => ({
          status: o.status,
          count: o._count,
        })),
        totalCount: orderCounts.reduce((s, o) => s + o._count, 0),
      },
      refunds: {
        count: refundAgg._count,
        total: Number(refundAgg._sum.totalAmount ?? 0),
      },
      totals: {
        grossSales: this.money(totalSales),
        totalRefunds: this.money(totalRefunds),
        netSales: this.money(totalSales - totalRefunds),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Close preview — compute expected cash and variance WITHOUT closing.
   * POST /shifts/:id/close-preview
   */
  async closePreview(tenantId: string, shiftId: string, dto: ClosePreviewDto) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
      select: { status: true, startCash: true },
    });

    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException('Shift is already closed');
    }

    const { expectedCash, cashBreakdown, startCash } =
      await this.computeExpectedCash(shiftId);
    const paymentSummary = await this.buildPaymentSummary(shiftId);

    const isBlind = dto.closeMode === ShiftCloseMode.BLIND;

    // In BLIND mode, countedCash is required to show variance
    const countedCash = dto.countedCash;
    const hasCount = countedCash !== undefined && countedCash !== null;

    const varianceAmount = hasCount
      ? this.money(countedCash - expectedCash)
      : null;
    const variancePercent =
      hasCount && expectedCash !== 0
        ? this.money(
            (Math.abs(countedCash - expectedCash) / expectedCash) * 100,
          )
        : hasCount
          ? countedCash > 0
            ? 100
            : 0
          : null;

    const needsApproval =
      variancePercent !== null &&
      Math.abs(variancePercent) >=
        ShiftsService.VARIANCE_APPROVAL_REQUIRED_PERCENT;

    const hasWarning =
      variancePercent !== null &&
      Math.abs(variancePercent) >= ShiftsService.VARIANCE_WARNING_PERCENT &&
      !needsApproval;

    return {
      shiftId,
      startCash,
      // In BLIND mode, hide expected until countedCash is provided
      expectedCash: isBlind && !hasCount ? null : expectedCash,
      countedCash: countedCash ?? null,
      varianceAmount,
      variancePercent,
      cashBreakdown: isBlind && !hasCount ? null : cashBreakdown,
      paymentSummary,
      needsApproval,
      hasWarning,
      thresholds: {
        warningPercent: ShiftsService.VARIANCE_WARNING_PERCENT,
        approvalRequiredPercent:
          ShiftsService.VARIANCE_APPROVAL_REQUIRED_PERCENT,
      },
    };
  }

  /**
   * Close a shift — finalize with counted cash, persist summaries and Z-report.
   *
   * State machine:
   *   OPEN → CLOSED (closeResult = BALANCED | OVER | SHORT | NEEDS_APPROVAL)
   *
   * Approval is NEVER inline. If variance >= threshold the shift is closed
   * with closeResult=NEEDS_APPROVAL.  A separate approve-close call is needed.
   *
   * Concurrency: Serializable isolation prevents duplicate writes.
   * Idempotent: if shift is already CLOSED, returns existing data.
   */
  async closeShift(
    tenantId: string,
    userId: string,
    shiftId: string,
    dto: CloseShiftDto,
  ) {
    const { countedCash, closeMode, notes } = dto;

    // Idempotency: if already closed, return deterministic existing result
    const existingShift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
      include: {
        branch: { select: { id: true, name: true } },
        device: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        paymentSummaries: true,
        reportSnapshot: true,
      },
    });

    if (!existingShift) throw new NotFoundException('Shift not found');

    if (existingShift.status === ShiftStatus.CLOSED) {
      // Already closed — return existing state without re-writing
      return existingShift;
    }

    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // Re-read inside serializable transaction for concurrency safety
            const shift = await tx.shift.findFirst({
              where: { id: shiftId, tenantId, status: ShiftStatus.OPEN },
            });
            if (!shift) {
              // Another call closed it concurrently — return the now-closed shift
              const concurrent = await tx.shift.findFirst({
                where: { id: shiftId, tenantId },
                include: {
                  branch: { select: { id: true, name: true } },
                  device: { select: { id: true, name: true } },
                  user: { select: { id: true, name: true } },
                  closedBy: { select: { id: true, name: true } },
                  paymentSummaries: true,
                  reportSnapshot: true,
                },
              });
              if (concurrent) return concurrent;
              throw new BadRequestException(
                'Shift is not open or was closed concurrently',
              );
            }

            const { expectedCash, cashBreakdown } =
              await this.computeExpectedCash(shiftId, tx);
            const paymentSummary = await this.buildPaymentSummary(shiftId, tx);

            const varianceAmount = this.money(countedCash - expectedCash);
            const variancePercent =
              expectedCash !== 0
                ? this.money(
                    (Math.abs(countedCash - expectedCash) / expectedCash) * 100,
                  )
                : countedCash > 0
                  ? 100
                  : 0;

            // Determine close result — NO inline approval allowed
            let closeResult: ShiftCloseResult;
            const absVariance = Math.abs(variancePercent);

            if (
              absVariance >= ShiftsService.VARIANCE_APPROVAL_REQUIRED_PERCENT
            ) {
              closeResult = ShiftCloseResult.NEEDS_APPROVAL;
            } else if (varianceAmount > 0) {
              closeResult = ShiftCloseResult.OVER;
            } else if (varianceAmount < 0) {
              closeResult = ShiftCloseResult.SHORT;
            } else {
              closeResult = ShiftCloseResult.BALANCED;
            }

            const endTime = new Date();

            const updatedShift = await tx.shift.update({
              where: { id: shiftId },
              data: {
                status: ShiftStatus.CLOSED,
                endTime,
                endCash: expectedCash,
                actualCash: countedCash,
                difference: varianceAmount,
                closedById: userId,
                closeMode,
                closeResult,
                varianceAmount,
                variancePercent,
                notes: notes || null,
              },
              include: {
                branch: { select: { id: true, name: true } },
                device: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } },
                closedBy: { select: { id: true, name: true } },
              },
            });

            // Persist ShiftPaymentSummary rows
            if (paymentSummary.length > 0) {
              await tx.shiftPaymentSummary.createMany({
                data: paymentSummary.map((ps) => ({
                  shiftId,
                  method: ps.method,
                  salesCount: ps.salesCount,
                  salesTotal: ps.salesTotal,
                  refundsCount: ps.refundsCount,
                  refundsTotal: ps.refundsTotal,
                  netTotal: ps.netTotal,
                })),
              });
            }

            // Build and persist Z-report snapshot
            const zPayload = await this.buildZReportPayload(
              shiftId,
              tenantId,
              expectedCash,
              countedCash,
              varianceAmount,
              paymentSummary,
              cashBreakdown,
              tx,
            );

            await tx.shiftReportSnapshot.create({
              data: {
                shiftId,
                payload: zPayload,
              },
            });

            return {
              ...updatedShift,
              expectedCash,
              varianceAmount,
              variancePercent,
              closeResult,
              paymentSummary,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        // Retry on serialization/write-conflict errors (Prisma P2034)
        const isPrismaConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (isPrismaConflict && attempt < MAX_RETRIES) {
          // Exponential backoff: 50ms, 150ms
          await new Promise((r) =>
            setTimeout(r, 50 * Math.pow(3, attempt - 1)),
          );
          continue;
        }
        throw error;
      }
    }

    // Unreachable — the loop always returns or throws
    throw new BadRequestException('Failed to close shift after retries');
  }

  /**
   * Manager approval for a shift that closed with NEEDS_APPROVAL.
   *
   * Guards:
   *   - Role must be ADMIN or MANAGER
   *   - Approver must NOT be the same user who closed the shift (no self-approval)
   *   - Shift must be CLOSED with closeResult = NEEDS_APPROVAL
   */
  async approveClose(
    tenantId: string,
    approverUserId: string,
    approverRole: string,
    shiftId: string,
    dto: ApproveCloseDto,
  ) {
    // Only ADMIN or MANAGER can approve
    if (approverRole !== UserRole.ADMIN && approverRole !== UserRole.MANAGER) {
      throw new ForbiddenException(
        'Only managers or admins can approve shift closes',
      );
    }

    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
    });

    if (!shift) throw new NotFoundException('Shift not found');

    if (
      shift.status !== ShiftStatus.CLOSED ||
      shift.closeResult !== ShiftCloseResult.NEEDS_APPROVAL
    ) {
      throw new BadRequestException(
        'This shift does not require approval or has already been approved',
      );
    }

    // Prevent self-approval: approver must not be the user who closed the shift
    if (shift.closedById === approverUserId) {
      throw new ForbiddenException('Cannot approve your own shift close');
    }

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        closeResult: ShiftCloseResult.APPROVED,
        approvedById: approverUserId,
        approvalNote: dto.approvalNote || null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        device: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  /**
   * X Report — live mid-shift snapshot (non-final).
   * GET /shifts/:id/x-report
   */
  async getXReport(tenantId: string, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        startCash: true,
        actualCash: true,
        varianceAmount: true,
        variancePercent: true,
        branchId: true,
        deviceId: true,
        userId: true,
        branch: { select: { id: true, name: true } },
        device: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!shift) throw new NotFoundException('Shift not found');

    const { expectedCash, cashBreakdown, startCash } =
      await this.computeExpectedCash(shiftId);
    const paymentSummary = await this.buildPaymentSummary(shiftId);

    // Order counts
    const orderCounts = await this.prisma.order.groupBy({
      by: ['status'],
      where: { shiftId },
      _count: true,
    });

    // Refund totals
    const refundAgg = await this.prisma.refund.aggregate({
      where: { shiftId },
      _count: true,
      _sum: { totalAmount: true },
    });

    const totalSales = paymentSummary.reduce((s, p) => s + p.salesTotal, 0);
    const totalRefunds = paymentSummary.reduce((s, p) => s + p.refundsTotal, 0);

    // Variance: deterministic for both open and closed shifts
    const countedCash =
      shift.status === ShiftStatus.CLOSED && shift.actualCash !== null
        ? Number(shift.actualCash)
        : null;
    const varianceAmount =
      countedCash !== null ? this.money(countedCash - expectedCash) : 0;
    const variancePercent =
      countedCash !== null && expectedCash !== 0
        ? this.money(
            (Math.abs(countedCash - expectedCash) / expectedCash) * 100,
          )
        : 0;

    return {
      type: 'X_REPORT',
      shiftId: shift.id,
      status: shift.status,
      startTime: shift.startTime.toISOString(),
      currentTime: new Date().toISOString(),
      branch: shift.branch,
      device: shift.device,
      cashier: shift.user,
      startCash,
      expectedCash,
      countedCash,
      varianceAmount,
      variancePercent,
      cashBreakdown,
      paymentSummary,
      orders: {
        byStatus: orderCounts.map((o) => ({
          status: o.status,
          count: o._count,
        })),
        totalCount: orderCounts.reduce((s, o) => s + o._count, 0),
      },
      refunds: {
        count: refundAgg._count,
        total: Number(refundAgg._sum.totalAmount ?? 0),
      },
      totals: {
        grossSales: this.money(totalSales),
        totalRefunds: this.money(totalRefunds),
        netSales: this.money(totalSales - totalRefunds),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * List shifts with pagination and filters.
   * GET /shifts?branchId=&status=&page=1&limit=20
   */
  async findAll(
    tenantId: string,
    params: {
      branchId?: string;
      deviceId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftWhereInput = {
      tenantId,
      ...(params.branchId && { branchId: params.branchId }),
      ...(params.deviceId && { deviceId: params.deviceId }),
      ...(params.status && { status: params.status as ShiftStatus }),
    };

    const [totalCount, data] = await Promise.all([
      this.prisma.shift.count({ where }),
      this.prisma.shift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          device: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
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

  private money(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
