import { AdjustmentType } from "@/dto/inventory.dto";

export const ADJUSTMENT_OPTIONS = [
  { label: "Stock In (Add)", value: "STOCK_IN" },
  { label: "Stock Out (Remove)", value: "STOCK_OUT" },
  { label: "Set Stock (Override)", value: "SET_STOCK" },
];

export const getQuantityMeta = (type: AdjustmentType) => {
  const meta = {
    STOCK_IN: {
      placeholder: "e.g. 50",
      subLabel: "Quantity to add to stock",
    },
    STOCK_OUT: {
      placeholder: "e.g. 30",
      subLabel: "Quantity to remove from stock",
    },
    SET_STOCK: {
      placeholder: "e.g. 100",
      subLabel: "Set the absolute stock level",
    },
  };

  return (
    meta[type] || {
      placeholder: "e.g. 50",
      subLabel: "Quantity to add to stock",
    }
  );
};

export const buildDefaultReason = (
  type: AdjustmentType,
  quantity: number,
  minStock?: number,
) => {
  const base =
    type === "SET_STOCK"
      ? `Stock set to ${quantity}`
      : type === "STOCK_IN"
        ? `Added ${quantity} units`
        : `Removed ${quantity} units`;

  return minStock !== undefined
    ? `${base} | Min stock set to ${minStock}`
    : base;
};
