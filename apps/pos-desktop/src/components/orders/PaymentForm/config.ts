import { LoyaltyProgram } from "@/dto/loyalty.dto";
import { PaymentMethod } from "@repo/types";

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: string;
}[] = [
  { value: "CASH", label: "Cash", icon: "Banknote" },
  { value: "CARD", label: "Card", icon: "CreditCard" },
  { value: "ONLINE", label: "Online", icon: "Smartphone" },
];

export function estimateLoyaltyDiscount(
  redeemPoints: number,
  program: LoyaltyProgram | undefined,
  eligibleBase: number,
): { appliedDiscount: number; appliedPoints: number } {
  if (
    !program ||
    !program.isEnabled ||
    !program.redeemPointsStep ||
    !program.redeemCurrencyPerStep ||
    program.maxRedeemPercent == null ||
    redeemPoints <= 0
  ) {
    return { appliedDiscount: 0, appliedPoints: 0 };
  }

  if (redeemPoints < (program.minRedeemPoints || 0)) {
    return { appliedDiscount: 0, appliedPoints: 0 };
  }

  const blockCount = Math.floor(redeemPoints / program.redeemPointsStep);
  const requestedDiscount = blockCount * program.redeemCurrencyPerStep;
  const maxDiscountByPercent = (eligibleBase * program.maxRedeemPercent) / 100;
  const appliedDiscount =
    Math.floor(
      Math.min(requestedDiscount, maxDiscountByPercent, eligibleBase) * 100,
    ) / 100;
  const appliedPoints =
    Math.floor(appliedDiscount / program.redeemCurrencyPerStep) *
    program.redeemPointsStep;

  return { appliedDiscount, appliedPoints };
}
