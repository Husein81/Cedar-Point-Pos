import { Prisma } from '../../generated/prisma/client.js';

type DecimalInput = Prisma.Decimal | string | number;

/**
 * Centralised Decimal-safe math for loyalty calculations.
 *
 * Rules (from spec):
 *   - Currency amounts: 2 decimal places
 *   - Points: integer only
 *   - All conversions: floor
 *   - Refund proportional math: floor and monotonic
 *   - No floating-point arithmetic allowed
 */
export class LoyaltyMath {
  // ───────────────────── helpers ─────────────────────

  /** Convert any input to Prisma.Decimal. */
  static toDecimal(v: DecimalInput): Prisma.Decimal {
    return new Prisma.Decimal(v as string | number);
  }

  /** Round a decimal to 2 places (ROUND_DOWN / floor). */
  static roundCurrency(v: DecimalInput): Prisma.Decimal {
    return LoyaltyMath.toDecimal(v).toDecimalPlaces(
      2,
      Prisma.Decimal.ROUND_DOWN,
    );
  }

  /** Floor to integer (for points). */
  static floorToInt(v: DecimalInput): number {
    return LoyaltyMath.toDecimal(v).floor().toNumber();
  }

  /** Ensure value is non-negative; clamp to 0 if negative. */
  static maxZero(v: DecimalInput): Prisma.Decimal {
    const d = LoyaltyMath.toDecimal(v);
    return d.isNegative() ? new Prisma.Decimal(0) : d;
  }

  /** min(a, b) for Decimal */
  static min(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
    const da = LoyaltyMath.toDecimal(a);
    const db = LoyaltyMath.toDecimal(b);
    return da.lessThanOrEqualTo(db) ? da : db;
  }

  /** max(a, b) for Decimal */
  static max(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
    const da = LoyaltyMath.toDecimal(a);
    const db = LoyaltyMath.toDecimal(b);
    return da.greaterThanOrEqualTo(db) ? da : db;
  }

  // ───────────────────── earn ─────────────────────

  /**
   * Compute eligible base at completion.
   *
   * eligibleBase = max(0, subtotalAfterItemDiscounts - orderLevelDiscount - loyaltyRedeemedAmount)
   */
  static computeEligibleBase(
    subtotalAfterItemDiscounts: DecimalInput,
    orderLevelDiscount: DecimalInput,
    loyaltyRedeemedAmount: DecimalInput,
  ): Prisma.Decimal {
    const base = LoyaltyMath.toDecimal(subtotalAfterItemDiscounts)
      .minus(LoyaltyMath.toDecimal(orderLevelDiscount))
      .minus(LoyaltyMath.toDecimal(loyaltyRedeemedAmount));
    return LoyaltyMath.maxZero(base);
  }

  /**
   * Compute earned points from an eligible base.
   *
   * earnedPoints = floor(eligibleBase * earnPointsPerCurrency)
   */
  static computeEarnedPoints(
    eligibleBase: DecimalInput,
    earnPointsPerCurrency: DecimalInput,
  ): number {
    return LoyaltyMath.floorToInt(
      LoyaltyMath.toDecimal(eligibleBase).mul(
        LoyaltyMath.toDecimal(earnPointsPerCurrency),
      ),
    );
  }

  // ───────────────────── redeem ─────────────────────

  /**
   * Compute redemption conversion.
   *
   * blockCount = floor(requestedPoints / redeemPointsStep)
   * requestedDiscount = blockCount * redeemCurrencyPerStep
   * maxDiscountByPercent = eligibleBase * (maxRedeemPercent / 100)
   * appliedDiscount = min(requestedDiscount, maxDiscountByPercent, eligibleBase)
   * appliedPoints = floor(appliedDiscount / redeemCurrencyPerStep) * redeemPointsStep
   */
  static computeRedemption(params: {
    requestedPoints: number;
    redeemPointsStep: number;
    redeemCurrencyPerStep: DecimalInput;
    maxRedeemPercent: DecimalInput;
    eligibleBase: DecimalInput;
  }): { appliedDiscount: Prisma.Decimal; appliedPoints: number } {
    const {
      requestedPoints,
      redeemPointsStep,
      redeemCurrencyPerStep,
      maxRedeemPercent,
      eligibleBase,
    } = params;

    const step = LoyaltyMath.toDecimal(redeemCurrencyPerStep);
    const base = LoyaltyMath.toDecimal(eligibleBase);
    const maxPct = LoyaltyMath.toDecimal(maxRedeemPercent);

    const blockCount = Math.floor(requestedPoints / redeemPointsStep);
    const requestedDiscount = step.mul(blockCount);

    const maxDiscountByPercent = base.mul(maxPct).div(100);

    const appliedDiscount = LoyaltyMath.roundCurrency(
      LoyaltyMath.min(
        requestedDiscount,
        LoyaltyMath.min(maxDiscountByPercent, base),
      ),
    );

    // Back-compute actual points consumed (always a multiple of step)
    const appliedPoints =
      LoyaltyMath.floorToInt(appliedDiscount.div(step)) * redeemPointsStep;

    return { appliedDiscount, appliedPoints };
  }

  // ───────────────────── refund ─────────────────────

  /**
   * Compute refund proportional loyalty adjustments.
   *
   * ratio = min(1, eligibleRefundedAmountAfter / loyaltyEligibleBaseAtCompletion)
   * targetRestore = floor(order.loyaltyRedeemedPoints * ratio)
   * targetReverse = floor(order.loyaltyEarnedPoints * ratio)
   * incrementRestore = max(0, targetRestore - alreadyRestored)
   * incrementReverse = max(0, targetReverse - alreadyReversed)
   */
  static computeRefundLoyaltyAdjustments(params: {
    eligibleRefundedAmountAfter: DecimalInput;
    loyaltyEligibleBaseAtCompletion: DecimalInput;
    loyaltyRedeemedPoints: number;
    loyaltyEarnedPoints: number;
    alreadyRestored: number;
    alreadyReversed: number;
  }): { incrementRestore: number; incrementReverse: number } {
    const {
      eligibleRefundedAmountAfter,
      loyaltyEligibleBaseAtCompletion,
      loyaltyRedeemedPoints,
      loyaltyEarnedPoints,
      alreadyRestored,
      alreadyReversed,
    } = params;

    const baseAtCompletion = LoyaltyMath.toDecimal(
      loyaltyEligibleBaseAtCompletion,
    );

    // Guard against division by zero
    if (baseAtCompletion.isZero()) {
      return { incrementRestore: 0, incrementReverse: 0 };
    }

    const ratio = LoyaltyMath.min(
      1,
      LoyaltyMath.toDecimal(eligibleRefundedAmountAfter).div(baseAtCompletion),
    );

    const targetRestore = LoyaltyMath.floorToInt(
      ratio.mul(loyaltyRedeemedPoints),
    );
    const targetReverse = LoyaltyMath.floorToInt(
      ratio.mul(loyaltyEarnedPoints),
    );

    const incrementRestore = Math.max(0, targetRestore - alreadyRestored);
    const incrementReverse = Math.max(0, targetReverse - alreadyReversed);

    return { incrementRestore, incrementReverse };
  }

  // ───────────────────── reconciliation ─────────────────────

  /**
   * Compute allowed loyalty redemption after order edits.
   * Returns the max points that should be redeemed given new order totals.
   */
  static computeAllowedRedemption(params: {
    newEligibleBase: DecimalInput;
    redeemPointsStep: number;
    redeemCurrencyPerStep: DecimalInput;
    maxRedeemPercent: DecimalInput;
    currentRedeemedPoints: number;
  }): number {
    const {
      newEligibleBase,
      redeemPointsStep,
      redeemCurrencyPerStep,
      maxRedeemPercent,
      currentRedeemedPoints,
    } = params;

    const base = LoyaltyMath.toDecimal(newEligibleBase);
    const step = LoyaltyMath.toDecimal(redeemCurrencyPerStep);
    const maxPct = LoyaltyMath.toDecimal(maxRedeemPercent);

    const maxDiscountByPercent = base.mul(maxPct).div(100);
    const maxDiscount = LoyaltyMath.roundCurrency(
      LoyaltyMath.min(maxDiscountByPercent, base),
    );

    const maxPoints =
      LoyaltyMath.floorToInt(maxDiscount.div(step)) * redeemPointsStep;

    return Math.min(currentRedeemedPoints, maxPoints);
  }
}
