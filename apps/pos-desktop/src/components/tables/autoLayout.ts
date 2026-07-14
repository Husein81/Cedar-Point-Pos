import type { TableOverview } from "@/dto/tables.dto";
import { getTableSize } from "./config";

export interface ResolvedPosition {
  x: number;
  y: number;
}

const GAP = 32;
const COLUMNS = 5;

/**
 * Resolve every table to a world position. Tables with saved geometry keep
 * it; unplaced tables flow into a grid below the placed ones so a floor is
 * usable before a manager has arranged it (and stays deterministic).
 * Pure function — safe to memoize on the tables array.
 */
export const resolveTablePositions = (
  tables: TableOverview[],
): Map<string, ResolvedPosition> => {
  const positions = new Map<string, ResolvedPosition>();

  let placedMaxY = 0;
  const unplaced: TableOverview[] = [];

  for (const table of tables) {
    if (table.posX != null && table.posY != null) {
      positions.set(table.id, { x: table.posX, y: table.posY });
      const { height } = getTableSize(table);
      placedMaxY = Math.max(placedMaxY, table.posY + height);
    } else {
      unplaced.push(table);
    }
  }

  if (unplaced.length === 0) return positions;

  // Flow the unplaced tables into rows beneath the arranged area.
  const startY = placedMaxY > 0 ? placedMaxY + GAP * 2 : GAP;
  let x = GAP;
  let y = startY;
  let rowHeight = 0;
  let column = 0;

  for (const table of unplaced) {
    const { width, height } = getTableSize(table);

    if (column >= COLUMNS) {
      column = 0;
      x = GAP;
      y += rowHeight + GAP;
      rowHeight = 0;
    }

    positions.set(table.id, { x, y });
    x += width + GAP;
    rowHeight = Math.max(rowHeight, height);
    column += 1;
  }

  return positions;
};

/** Bounding box of all resolved nodes — used for fit-to-view. */
export const getFloorBounds = (
  tables: TableOverview[],
  positions: Map<string, ResolvedPosition>,
): { minX: number; minY: number; maxX: number; maxY: number } | null => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const table of tables) {
    const pos = positions.get(table.id);
    if (!pos) continue;
    const { width, height } = getTableSize(table);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + width);
    maxY = Math.max(maxY, pos.y + height);
  }

  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
};
