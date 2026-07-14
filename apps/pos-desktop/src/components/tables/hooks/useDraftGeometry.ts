import { useCallback, useState } from "react";
import type { TableShape } from "@repo/types";
import type { TableOverview } from "@/dto/tables.dto";
import { getTableSize } from "../config";
import type { ResolvedPosition } from "../autoLayout";

export interface DraftGeometry {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  shape?: TableShape;
}

export type DraftMap = Map<string, DraftGeometry>;

export interface DraftGeometryApi {
  /** Raw draft overrides, keyed by table id — read by callers that persist it. */
  draft: DraftMap;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  getBaseGeometry: (table: TableOverview) => DraftGeometry;
  /** Merged (draft-over-base) geometry for a node, with shape defaults resolved. */
  getGeometry: (
    table: TableOverview,
  ) => Required<
    Pick<DraftGeometry, "x" | "y" | "width" | "height" | "rotation">
  > & { shape: TableShape | undefined };
  /** Snapshot the current draft onto the undo stack before a change. */
  pushHistory: () => void;
  setDraftGeometry: (tableId: string, geometry: DraftGeometry) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

/**
 * The floor editor's draft geometry: per-table overrides layered on the
 * saved base positions, plus undo/redo history. Pure state — no DOM, no
 * network. Callers (drag, toolbar controls) decide *when* a change is
 * significant enough to checkpoint via `pushHistory`.
 */
export const useDraftGeometry = (
  basePositions: Map<string, ResolvedPosition>,
): DraftGeometryApi => {
  const [draft, setDraft] = useState<DraftMap>(new Map());
  const [undoStack, setUndoStack] = useState<DraftMap[]>([]);
  const [redoStack, setRedoStack] = useState<DraftMap[]>([]);

  const getBaseGeometry = useCallback(
    (table: TableOverview): DraftGeometry => {
      const pos = basePositions.get(table.id) ?? { x: 0, y: 0 };
      return {
        x: pos.x,
        y: pos.y,
        width: table.width ?? undefined,
        height: table.height ?? undefined,
        rotation: table.rotation ?? 0,
        shape: table.shape,
      };
    },
    [basePositions],
  );

  const getGeometry = useCallback(
    (table: TableOverview) => {
      const base = getBaseGeometry(table);
      const override = draft.get(table.id);
      const merged = { ...base, ...override };
      const size = getTableSize({
        width: merged.width ?? null,
        height: merged.height ?? null,
        shape: merged.shape,
      });
      return {
        x: merged.x,
        y: merged.y,
        width: size.width,
        height: size.height,
        rotation: merged.rotation ?? 0,
        shape: merged.shape,
      };
    },
    [draft, getBaseGeometry],
  );

  const pushHistory = useCallback(() => {
    setUndoStack((stack) => [...stack, new Map(draft)]);
    setRedoStack([]);
  }, [draft]);

  const setDraftGeometry = useCallback(
    (tableId: string, geometry: DraftGeometry) => {
      setDraft((prev) => {
        const next = new Map(prev);
        next.set(tableId, geometry);
        return next;
      });
    },
    [],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      const previous = stack[stack.length - 1];
      if (!previous) return stack;
      setRedoStack((redo) => [...redo, new Map(draft)]);
      setDraft(new Map(previous));
      return stack.slice(0, -1);
    });
  }, [draft]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      const next = stack[stack.length - 1];
      if (!next) return stack;
      setUndoStack((undoS) => [...undoS, new Map(draft)]);
      setDraft(new Map(next));
      return stack.slice(0, -1);
    });
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(new Map());
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    draft,
    isDirty: draft.size > 0,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    getBaseGeometry,
    getGeometry,
    pushHistory,
    setDraftGeometry,
    undo,
    redo,
    reset,
  };
};
