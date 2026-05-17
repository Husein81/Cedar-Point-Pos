import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  LoyaltyDirection,
  LoyaltyTransactionType,
  LoyaltyEnrollmentMode,
  type UserRole,
} from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto.js';
import type { ManualAdjustmentDto } from './dto/manual-adjustment.dto.js';
import type { LoyaltyTransactionQueryDto } from './dto/list-loyalty-transactions.dto.js';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  //  PROGRAM CONFIG
  // ──────────────────────────────────────────────

  /**
   * Get the loyalty program config for a tenant.
   * Returns null fields when no program has been configured yet.
   */
  async getProgram(tenantId: string) {
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { tenantId },
    });

    if (!program) {
      // Return a "blank" shape so the frontend always gets a consistent object
      return {
        tenantId,
        isEnabled: false,
        enrollmentMode: LoyaltyEnrollmentMode.AUTO,
        earnPointsPerCurrency: null,
        redeemPointsStep: null,
        redeemCurrencyPerStep: null,
        minRedeemPoints: 0,
        maxRedeemPercent: null,
        allowNoCustomerAccrual: false,
        pointsExpirationDays: null,
      };
    }

    return program;
  }

  /**
   * Create or update the loyalty program config for a tenant.
   *
   * Validation:
   *  - Enabling requires all config fields to be sane.
   */
  async updateProgram(tenantId: string, dto: UpdateLoyaltyProgramDto) {
    // If the request wants to enable, we must validate the FULL config
    // (merge current DB values with incoming dto to validate the resulting state)
    const existing = await this.prisma.loyaltyProgram.findUnique({
      where: { tenantId },
    });

    const merged = {
      isEnabled: dto.isEnabled ?? existing?.isEnabled ?? false,
      earnPointsPerCurrency:
        dto.earnPointsPerCurrency ??
        (existing?.earnPointsPerCurrency
          ? Number(existing.earnPointsPerCurrency)
          : null),
      redeemPointsStep:
        dto.redeemPointsStep ?? existing?.redeemPointsStep ?? null,
      redeemCurrencyPerStep:
        dto.redeemCurrencyPerStep ??
        (existing?.redeemCurrencyPerStep
          ? Number(existing.redeemCurrencyPerStep)
          : null),
      minRedeemPoints: dto.minRedeemPoints ?? existing?.minRedeemPoints ?? 0,
      maxRedeemPercent:
        dto.maxRedeemPercent ??
        (existing?.maxRedeemPercent ? Number(existing.maxRedeemPercent) : null),
    };

    if (merged.isEnabled) {
      this.validateEnableConfig(merged);
    }

    // Upsert — idempotent for first-time creation
    return this.prisma.loyaltyProgram.upsert({
      where: { tenantId },
      create: {
        tenantId,
        isEnabled: dto.isEnabled ?? false,
        enrollmentMode: dto.enrollmentMode ?? LoyaltyEnrollmentMode.AUTO,
        earnPointsPerCurrency: dto.earnPointsPerCurrency,
        redeemPointsStep: dto.redeemPointsStep,
        redeemCurrencyPerStep: dto.redeemCurrencyPerStep,
        minRedeemPoints: dto.minRedeemPoints ?? 0,
        maxRedeemPercent: dto.maxRedeemPercent,
        allowNoCustomerAccrual: dto.allowNoCustomerAccrual,
        pointsExpirationDays: dto.pointsExpirationDays,
      },
      update: {
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.enrollmentMode !== undefined && {
          enrollmentMode: dto.enrollmentMode,
        }),
        ...(dto.earnPointsPerCurrency !== undefined && {
          earnPointsPerCurrency: dto.earnPointsPerCurrency,
        }),
        ...(dto.redeemPointsStep !== undefined && {
          redeemPointsStep: dto.redeemPointsStep,
        }),
        ...(dto.redeemCurrencyPerStep !== undefined && {
          redeemCurrencyPerStep: dto.redeemCurrencyPerStep,
        }),
        ...(dto.minRedeemPoints !== undefined && {
          minRedeemPoints: dto.minRedeemPoints,
        }),
        ...(dto.maxRedeemPercent !== undefined && {
          maxRedeemPercent: dto.maxRedeemPercent,
        }),
        ...(dto.allowNoCustomerAccrual !== undefined && {
          allowNoCustomerAccrual: dto.allowNoCustomerAccrual,
        }),
        ...(dto.pointsExpirationDays !== undefined && {
          pointsExpirationDays: dto.pointsExpirationDays,
        }),
      },
    });
  }

  /** Reject enabling when config is incomplete or invalid. */
  private validateEnableConfig(cfg: {
    earnPointsPerCurrency: number | null;
    redeemPointsStep: number | null;
    redeemCurrencyPerStep: number | null;
    minRedeemPoints: number;
    maxRedeemPercent: number | null;
  }) {
    const errors: string[] = [];

    if (!cfg.earnPointsPerCurrency || cfg.earnPointsPerCurrency <= 0)
      errors.push('earnPointsPerCurrency must be > 0');
    if (!cfg.redeemPointsStep || cfg.redeemPointsStep <= 0)
      errors.push('redeemPointsStep must be > 0');
    if (!cfg.redeemCurrencyPerStep || cfg.redeemCurrencyPerStep <= 0)
      errors.push('redeemCurrencyPerStep must be > 0');
    if (cfg.minRedeemPoints < 0) errors.push('minRedeemPoints must be >= 0');
    if (
      cfg.maxRedeemPercent === null ||
      cfg.maxRedeemPercent < 0 ||
      cfg.maxRedeemPercent > 100
    )
      errors.push('maxRedeemPercent must be between 0 and 100');

    if (errors.length > 0) {
      throw new BadRequestException(
        `Cannot enable loyalty: ${errors.join('; ')}`,
      );
    }
  }

  // ──────────────────────────────────────────────
  //  ACCOUNT (lazy creation + read)
  // ──────────────────────────────────────────────

  /**
   * Get or lazily create a loyalty account for a customer.
   *
   * Uses connectOrCreate-style logic with unique constraint
   * to safely handle concurrent first-access race conditions.
   */
  async getOrCreateAccount(tenantId: string, customerId: string) {
    // Verify customer belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found in this tenant');
    }

    try {
      return await this.prisma.loyaltyAccount.upsert({
        where: {
          tenantId_customerId: { tenantId, customerId },
        },
        create: {
          tenantId,
          customerId,
          pointsBalance: 0,
          lifetimeEarned: 0,
          lifetimeRedeemed: 0,
          lifetimeRestored: 0,
          lifetimeReversed: 0,
          lifetimeAdjusted: 0,
        },
        update: {}, // no-op — just return existing
      });
    } catch (e) {
      // If a race condition causes a unique constraint violation,
      // simply fetch the already-created row.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await this.prisma.loyaltyAccount.findUniqueOrThrow({
          where: {
            tenantId_customerId: { tenantId, customerId },
          },
        });
        return existing;
      }
      throw e;
    }
  }

  /**
   * Get account for a customer (read-only, for GET endpoint).
   * Returns null when no account exists yet.
   */
  async getAccount(tenantId: string, customerId: string) {
    // Verify customer belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found in this tenant');
    }

    const account = await this.prisma.loyaltyAccount.findUnique({
      where: {
        tenantId_customerId: { tenantId, customerId },
      },
    });

    if (!account) {
      // Return a "zero" representation so the frontend always gets a shape
      return {
        tenantId,
        customerId,
        pointsBalance: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        lifetimeRestored: 0,
        lifetimeReversed: 0,
        lifetimeAdjusted: 0,
      };
    }

    return account;
  }

  // ──────────────────────────────────────────────
  //  TRANSACTION LISTING
  // ──────────────────────────────────────────────

  /**
   * List loyalty transactions for a customer with pagination and filters.
   */
  async listTransactions(
    tenantId: string,
    customerId: string,
    query: LoyaltyTransactionQueryDto,
  ) {
    // Verify customer belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found in this tenant');
    }

    const { page, limit, type, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LoyaltyTransactionWhereInput = {
      tenantId,
      customerId,
      ...(type && { type }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    };

    const [totalCount, data] = await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.count({ where }),
      this.prisma.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: { id: true },
          },
          refund: {
            select: { id: true, totalAmount: true },
          },
          actorUser: {
            select: { id: true, name: true, role: true },
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

  // ──────────────────────────────────────────────
  //  LEDGER + BALANCE MUTATION (atomic helper)
  // ──────────────────────────────────────────────

  /**
   * Core atomic helper. Runs in a Prisma interactive transaction:
   *   1. Reads current balance (SELECT … FOR UPDATE via transaction isolation)
   *   2. Computes new balance, rejects if negative
   *   3. Inserts ledger row with unique idempotencyKey
   *   4. Updates account balance + lifetime counters
   *
   * Returns the created transaction row.
   * If idempotencyKey already exists, returns the existing row (idempotent retry).
   */
  async applyLedgerEntry(params: {
    tenantId: string;
    customerId: string;
    orderId?: string;
    refundId?: string;
    type: LoyaltyTransactionType;
    direction: LoyaltyDirection;
    points: number; // always positive magnitude
    moneyAmount?: Prisma.Decimal | number | string;
    idempotencyKey: string;
    reason?: string;
    actorUserId?: string;
    actorRole?: string;
    metadata?: Record<string, unknown>;
  }) {
    const {
      tenantId,
      customerId,
      orderId,
      refundId,
      type,
      direction,
      points,
      moneyAmount,
      idempotencyKey,
      reason,
      actorUserId,
      actorRole,
      metadata,
    } = params;

    if (points <= 0) {
      throw new BadRequestException('Ledger entry points must be positive');
    }

    // ── Fast idempotent check (outside transaction for speed) ──
    const existingTx = await this.prisma.loyaltyTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existingTx) {
      this.logger.log(
        `Idempotent hit for key=${idempotencyKey}, returning existing tx=${existingTx.id}`,
      );
      return existingTx;
    }

    // ── Interactive transaction (serializable within Prisma) ──
    return this.prisma.$transaction(async (tx) => {
      // Double-check idempotency inside tx (another request may have raced)
      const racedTx = await tx.loyaltyTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (racedTx) return racedTx;

      // Get-or-create account
      const account = await this.getOrCreateAccountInTx(
        tx,
        tenantId,
        customerId,
      );

      // Compute new balance
      const delta = direction === LoyaltyDirection.CREDIT ? points : -points;
      const newBalance = account.pointsBalance + delta;

      if (newBalance < 0) {
        throw new BadRequestException(
          `Insufficient loyalty balance. Current: ${account.pointsBalance}, requested debit: ${points}`,
        );
      }

      // Build lifetime counter increments
      const lifetimeIncrements = this.buildLifetimeIncrements(type, points);

      // Update account balance + lifetime counters
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          pointsBalance: newBalance,
          ...lifetimeIncrements,
        },
      });

      // Insert ledger row
      const txRow = await tx.loyaltyTransaction.create({
        data: {
          tenantId,
          accountId: account.id,
          customerId,
          orderId: orderId ?? null,
          refundId: refundId ?? null,
          type,
          direction,
          points,
          moneyAmount: moneyAmount != null ? String(moneyAmount) : null,
          balanceAfter: newBalance,
          idempotencyKey,
          reason: reason ?? null,
          actorUserId: actorUserId ?? null,
          metadata: {
            ...(metadata ?? {}),
            ...(actorRole ? { actorRoleSnapshot: actorRole } : {}),
          },
        },
      });

      this.logger.log(
        `Ledger entry created: type=${type} dir=${direction} pts=${points} key=${idempotencyKey} balAfter=${newBalance}`,
      );

      return txRow;
    });
  }

  /**
   * Get-or-create account inside an existing Prisma interactive transaction.
   */
  private async getOrCreateAccountInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    customerId: string,
  ) {
    const existing = await tx.loyaltyAccount.findUnique({
      where: {
        tenantId_customerId: { tenantId, customerId },
      },
    });

    if (existing) return existing;

    try {
      return await tx.loyaltyAccount.create({
        data: {
          tenantId,
          customerId,
          pointsBalance: 0,
          lifetimeEarned: 0,
          lifetimeRedeemed: 0,
          lifetimeRestored: 0,
          lifetimeReversed: 0,
          lifetimeAdjusted: 0,
        },
      });
    } catch (e) {
      // Race condition fallback
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return tx.loyaltyAccount.findUniqueOrThrow({
          where: {
            tenantId_customerId: { tenantId, customerId },
          },
        });
      }
      throw e;
    }
  }

  /**
   * Map transaction type → lifetime counter increments.
   */
  private buildLifetimeIncrements(
    type: LoyaltyTransactionType,
    points: number,
  ): Prisma.LoyaltyAccountUpdateInput {
    switch (type) {
      case LoyaltyTransactionType.EARN:
        return { lifetimeEarned: { increment: points } };
      case LoyaltyTransactionType.REDEEM:
        return { lifetimeRedeemed: { increment: points } };
      case LoyaltyTransactionType.REFUND_RESTORE_REDEEM:
        return { lifetimeRestored: { increment: points } };
      case LoyaltyTransactionType.REFUND_REVERSE_EARN:
        return { lifetimeReversed: { increment: points } };
      case LoyaltyTransactionType.MANUAL_ADJUSTMENT:
        return { lifetimeAdjusted: { increment: points } };
      case LoyaltyTransactionType.RECONCILE_RESTORE:
        return { lifetimeRestored: { increment: points } };
      default:
        return {};
    }
  }

  // ──────────────────────────────────────────────
  //  MANUAL ADJUSTMENT (public endpoint)
  // ──────────────────────────────────────────────

  /**
   * Create a manual loyalty point adjustment.
   *
   * - Positive points → CREDIT
   * - Negative points → DEBIT
   * - Reason is mandatory (enforced by DTO + here)
   * - actorUserId + actorRole captured in metadata
   */
  async manualAdjustment(
    tenantId: string,
    customerId: string,
    dto: ManualAdjustmentDto,
    actorUserId: string,
    actorRole: UserRole,
  ) {
    const { points, reason } = dto;

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Reason is required for manual adjustment');
    }

    const direction =
      points > 0 ? LoyaltyDirection.CREDIT : LoyaltyDirection.DEBIT;
    const absPoints = Math.abs(points);

    const idempotencyKey = `manual:${tenantId}:${customerId}:${Date.now()}`;

    return this.applyLedgerEntry({
      tenantId,
      customerId,
      type: LoyaltyTransactionType.MANUAL_ADJUSTMENT,
      direction,
      points: absPoints,
      idempotencyKey,
      reason,
      actorUserId,
      actorRole,
      metadata: {
        inputPoints: points, // signed value for audit
      },
    });
  }
}
