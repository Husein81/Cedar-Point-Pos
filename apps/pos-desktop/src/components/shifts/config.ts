export const SHIFT_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPEN: "default",
  CLOSED: "secondary",
};

export const SHIFT_CLOSE_RESULT_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  BALANCED: "default",
  OVER: "outline",
  SHORT: "destructive",
  NEEDS_APPROVAL: "destructive",
  APPROVED: "secondary",
};

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
};

export const SHIFT_CLOSE_RESULT_LABELS: Record<string, string> = {
  BALANCED: "Balanced",
  OVER: "Over",
  SHORT: "Short",
  NEEDS_APPROVAL: "Needs Approval",
  APPROVED: "Approved",
};

export const getShiftStatusVariant = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  return SHIFT_STATUS_VARIANTS[status] ?? "outline";
};

export const getShiftCloseResultVariant = (
  result: string,
): "default" | "secondary" | "destructive" | "outline" => {
  return SHIFT_CLOSE_RESULT_VARIANTS[result] ?? "outline";
};
