import { useCallback, useMemo, useRef, useState } from "react";
import type { TableShape } from "@repo/types";
import type { TableLayoutUpdate, TableOverview } from "@/dto/tables.dto";
import { useUpdateTableLayout } from "@/hooks/useTable";
import { useTableUiStore } from "@/store/tableUiStore";
import { getTableSize } from "./config";
import type { ResolvedPosition } from "./autoLayout";
import type { CanvasGesturesApi } from "./useCanvasGestures";

export const GRID_SIZE = 20;
const MIN_NODE_SIZE = 64;
const MAX_NODE_SIZE = 480;
const RESIZE_STEP = 16;
const ROTATE_STEP = 45;

export interface DraftGeometry {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  shape?: TableShape;
}

type DraftMap = Map<string, DraftGeometry>;

export interface FloorEditorApi {
  isDirty: boolean;
  isSaving: boolean;
  snapEnabled: boolean;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** Table currently selected inside the editor (toolbar target). */
  editorSelectedId: string | null;
  selectForEditing: (tableId: string | null) => void;
  /** Merged (draft-over-base) geometry for a node. */
  getGeometry: (table: TableOverview) => Required<
    Pick<DraftGeometry, "x" | "y" | "width" | "height" | "rotation">
  > & { shape: TableShape | undefined };
  startDrag: (tableId: string, e: React.PointerEvent) => void;
  rotateSelected: () => void;
  resizeSelected: (direction: 1 | -1) => void;
  setShapeSelected: (shape: TableShape) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  discard: () => void;
}

const snap = (value: number, enabled: boolean): number =>
  enabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : Math.round(value);

/**
 * Manager-mode floor editor: drag (with zoom-scale compensation), snap-to-grid,
 * rotate/resize/shape controls, undo/redo, and bulk save. Draft geometry lives
 * here — only touched tables are sent to `PATCH /tables/layout`.
 */
export const useFloorEditor = (options: {
  tables: TableOverview[];
  basePositions: Map<string, ResolvedPosition>;
  gestures: CanvasGesturesApi;
}): FloorEditorApi => {
  const { tables, basePositions, gestures } = options;
  const setEditingLayout = useTableUiStore((s) => s.setEditingLayout);
  const layoutMutation = useUpdateTableLayout();

  const [draft, setDraft] = useState<DraftMap>(new Map());
  const [undoStack, setUndoStack] = useState<DraftMap[]>([]);
  const [redoStack, setRedoStack] = useState<DraftMap[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [editorSelectedId, setEditorSelectedId] = useState<string | null>(null);

  const tableById = useMemo(
    () => new Map(tables.map((t) => [t.id, t])),
    [tables],
  );

  const dragRef = useRef<{
    tableId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origin: DraftGeometry;
    moved: boolean;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

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

  /** Snapshot the current draft onto the undo stack before a change. */
  const pushHistory = useCallback(() => {
    setUndoStack((stack) => [...stack, new Map(draft)]);
    setRedoStack([]);
  }, [draft]);

  const applyToSelected = useCallback(
    (mutate: (current: DraftGeometry, table: TableOverview) => DraftGeometry) => {
      if (!editorSelectedId) return;
      const table = tableById.get(editorSelectedId);
      if (!table) return;
      pushHistory();
      setDraft((prev) => {
        const next = new Map(prev);
        const current =
          next.get(editorSelectedId) ?? getBaseGeometry(table);
        next.set(editorSelectedId, mutate(current, table));
        return next;
      });
    },
    [editorSelectedId, getBaseGeometry, pushHistory, tableById],
  );

  const startDrag = useCallback(
    (tableId: string, e: React.PointerEvent) => {
      const table = tableById.get(tableId);
      if (!table) return;
      setEditorSelectedId(tableId);

      const origin = draft.get(tableId) ?? getBaseGeometry(table);
      dragRef.current = {
        tableId,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origin,
        moved: false,
      };

      const handleMove = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        const { scale } = gestures.getTransform();
        const dx = (ev.clientX - drag.startClientX) / scale;
        const dy = (ev.clientY - drag.startClientY) / scale;
        if (!drag.moved && Math.hypot(dx, dy) < 2) return;

        if (!drag.moved) {
          drag.moved = true;
          // First real movement — snapshot history once per drag.
          setUndoStack((stack) => [...stack, new Map(draft)]);
          setRedoStack([]);
        }

        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setDraft((prev) => {
            const next = new Map(prev);
            next.set(drag.tableId, {
              ...drag.origin,
              x: snap(drag.origin.x + dx, snapEnabled),
              y: snap(drag.origin.y + dy, snapEnabled),
            });
            return next;
          });
        });
      };

      const handleUp = (ev: PointerEvent) => {
        if (ev.pointerId !== dragRef.current?.pointerId) return;
        dragRef.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [draft, getBaseGeometry, gestures, snapEnabled, tableById],
  );

  const rotateSelected = useCallback(() => {
    applyToSelected((current) => ({
      ...current,
      rotation: (((current.rotation ?? 0) + ROTATE_STEP) % 360 + 360) % 360,
    }));
  }, [applyToSelected]);

  const resizeSelected = useCallback(
    (direction: 1 | -1) => {
      applyToSelected((current, table) => {
        const size = getTableSize({
          width: current.width ?? null,
          height: current.height ?? null,
          shape: current.shape ?? table.shape,
        });
        const clamp = (v: number) =>
          Math.min(MAX_NODE_SIZE, Math.max(MIN_NODE_SIZE, v));
        return {
          ...current,
          width: clamp(size.width + direction * RESIZE_STEP),
          height: clamp(size.height + direction * RESIZE_STEP),
        };
      });
    },
    [applyToSelected],
  );

  const setShapeSelected = useCallback(
    (shape: TableShape) => {
      applyToSelected((current) => ({
        ...current,
        shape,
        // Reset to the shape's default footprint when the shape changes.
        width: undefined,
        height: undefined,
      }));
    },
    [applyToSelected],
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
    setEditorSelectedId(null);
    setEditingLayout(false);
  }, [setEditingLayout]);

  const save = useCallback(() => {
    if (draft.size === 0) {
      reset();
      return;
    }
    const updates: TableLayoutUpdate[] = [];
    for (const [id, geometry] of draft) {
      const table = tableById.get(id);
      if (!table) continue;
      const size = getTableSize({
        width: geometry.width ?? table.width ?? null,
        height: geometry.height ?? table.height ?? null,
        shape: geometry.shape ?? table.shape,
      });
      updates.push({
        id,
        posX: geometry.x,
        posY: geometry.y,
        width: size.width,
        height: size.height,
        rotation: geometry.rotation ?? table.rotation ?? 0,
        shape: geometry.shape ?? table.shape,
      });
    }
    layoutMutation.mutate(updates, { onSuccess: reset });
  }, [draft, layoutMutation, reset, tableById]);

  return {
    isDirty: draft.size > 0,
    isSaving: layoutMutation.isPending,
    snapEnabled,
    showGrid,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    editorSelectedId,
    selectForEditing: setEditorSelectedId,
    getGeometry,
    startDrag,
    rotateSelected,
    resizeSelected,
    setShapeSelected,
    toggleSnap: () => setSnapEnabled((v) => !v),
    toggleGrid: () => setShowGrid((v) => !v),
    undo,
    redo,
    save,
    discard: reset,
  };
};
