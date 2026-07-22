import type { BulkImportColumn } from "@/components/common";
import { BulkProductRow, BulkProductRowSchema } from "@/dto/products.dto";

/**
 * CSV column contract for product bulk import. `key` values must match the
 * header names in the uploaded CSV (and the downloadable template).
 */
export const PRODUCT_IMPORT_COLUMNS: BulkImportColumn[] = [
  { key: "name", label: "Name", required: true },
  { key: "sku", label: "SKU" },
  { key: "barcode", label: "Barcode" },
  { key: "price", label: "Price" },
  { key: "cost", label: "Cost" },
  { key: "categoryName", label: "Category" },
  { key: "subcategoryName", label: "Subcategory" },
  { key: "stock", label: "Stock" },
  { key: "isActive", label: "Active" },
  { key: "isModifiable", label: "Modifiable" },
];

export const PRODUCT_IMPORT_SAMPLE: Record<string, string> = {
  name: "Espresso",
  sku: "ESP-001",
  barcode: "8901234567890",
  price: "3.50",
  cost: "1.20",
  categoryName: "Beverages",
  subcategoryName: "Hot Drinks",
  stock: "100",
  isActive: "true",
  isModifiable: "false",
};

/**
 * Turn one raw CSV record into a validated BulkProductRow, coercing the
 * string cells CSV always produces into numbers/booleans. A non-empty cell
 * that fails to parse fails the whole row — we never silently drop a malformed
 * price or flag into `undefined`. Category/subcategory existence is validated
 * server-side, not here.
 */
export function parseProductRow(
  raw: Record<string, string>,
): { data: BulkProductRow } | { error: string } {
  try {
    const candidate = {
      name: raw.name?.trim(),
      description: emptyToUndefined(raw.description),
      sku: emptyToUndefined(raw.sku),
      barcode: emptyToUndefined(raw.barcode),
      price: toNumber(raw.price, "price"),
      cost: toNumber(raw.cost, "cost"),
      categoryName: emptyToUndefined(raw.categoryName),
      subcategoryName: emptyToUndefined(raw.subcategoryName),
      stock: toNumber(raw.stock, "stock"),
      isActive: toBoolean(raw.isActive, "isActive"),
      isModifiable: toBoolean(raw.isModifiable, "isModifiable"),
    };

    const parsed = BulkProductRowSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const field = first?.path.join(".");
      return { error: field ? `${field}: ${first?.message}` : "Invalid row" };
    }
    return { data: parsed.data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid row",
    };
  }
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toNumber(value: string | undefined, field: string): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (Number.isNaN(num)) {
    throw new Error(`${field}: "${value}" is not a valid number`);
  }
  return num;
}

function toBoolean(
  value: string | undefined,
  field: string,
): boolean | undefined {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (["true", "yes", "1", "y"].includes(trimmed)) return true;
  if (["false", "no", "0", "n"].includes(trimmed)) return false;
  throw new Error(`${field}: "${value}" must be true or false`);
}
