import { useCallback, useMemo, useState } from "react";
import type { TableShape } from "@repo/types";
import type { TableLayoutUpdate, TableOverview } from "@/dto/tables.dto";
import { useUpdateTableLayout } from "@/hooks/useTable";
import { useTableUiStore } from "@/store/tableUiStore";
import { getTableSize } from "../config";
import type { ResolvedPosition } from "../autoLayout";
import type { CanvasGesturesApi } from "./useCanvasGestures";
import { useDraftGeometry, type DraftGeometry } from "./useDraftGeometry";
import { GRID_SIZE, useTableDrag } from "./useTableDrag";

export { GRID_SIZE };

const MIN_NODE_SIZE = 64;
const MAX_NODE_SIZE = 480;
const RESIZE_STEP = 16;
const ROTATE_STEP = 45;

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
  getGeometry: (
    table: TableOverview,
  ) => Required<
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

export const useFloorEditor = (options: {
  tables: TableOverview[];
  basePositions: Map<string, ResolvedPosition>;
  gestures: CanvasGesturesApi;
}): FloorEditorApi => {
  const { tables, basePositions, gestures } = options;
  const setEditingLayout = useTableUiStore((s) => s.setEditingLayout);
  const layoutMutation = useUpdateTableLayout();

  const geometry = useDraftGeometry(basePositions);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [editorSelectedId, setEditorSelectedId] = useState<string | null>(null);

  const tableById = useMemo(
    () => new Map(tables.map((t) => [t.id, t])),
    [tables],
  );

  /** Apply a mutation to the selected table's draft geometry, with history. */
  const applyToSelected = useCallback(
    (
      mutate: (current: DraftGeometry, table: TableOverview) => DraftGeometry,
    ) => {
      if (!editorSelectedId) return;
      const table = tableById.get(editorSelectedId);
      if (!table) return;
      geometry.pushHistory();
      const current =
        geometry.draft.get(editorSelectedId) ?? geometry.getBaseGeometry(table);
      geometry.setDraftGeometry(editorSelectedId, mutate(current, table));
    },
    [editorSelectedId, geometry, tableById],
  );

  const getDragOrigin = useCallback(
    (tableId: string): DraftGeometry | undefined => {
      const table = tableById.get(tableId);
      if (!table) return undefined;
      return geometry.draft.get(tableId) ?? geometry.getBaseGeometry(table);
    },
    [geometry, tableById],
  );

  const { startDrag } = useTableDrag({
    gestures,
    snapEnabled,
    getOrigin: getDragOrigin,
    onSelect: setEditorSelectedId,
    onDragBegin: geometry.pushHistory,
    onDragMove: geometry.setDraftGeometry,
  });

  const rotateSelected = useCallback(() => {
    applyToSelected((current) => ({
      ...current,
      rotation: ((((current.rotation ?? 0) + ROTATE_STEP) % 360) + 360) % 360,
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

  const reset = useCallback(() => {
    geometry.reset();
    setEditorSelectedId(null);
    setEditingLayout(false);
  }, [geometry, setEditingLayout]);

  const save = useCallback(() => {
    if (geometry.draft.size === 0) {
      reset();
      return;
    }
    const updates: TableLayoutUpdate[] = [];
    for (const [id, g] of geometry.draft) {
      const table = tableById.get(id);
      if (!table) continue;
      const size = getTableSize({
        width: g.width ?? table.width ?? null,
        height: g.height ?? table.height ?? null,
        shape: g.shape ?? table.shape,
      });
      updates.push({
        id,
        posX: g.x,
        posY: g.y,
        width: size.width,
        height: size.height,
        rotation: g.rotation ?? table.rotation ?? 0,
        shape: g.shape ?? table.shape,
      });
    }
    layoutMutation.mutate(updates, { onSuccess: reset });
  }, [geometry.draft, layoutMutation, reset, tableById]);

  return {
    isDirty: geometry.isDirty,
    isSaving: layoutMutation.isPending,
    snapEnabled,
    showGrid,
    canUndo: geometry.canUndo,
    canRedo: geometry.canRedo,
    editorSelectedId,
    selectForEditing: setEditorSelectedId,
    getGeometry: geometry.getGeometry,
    startDrag,
    rotateSelected,
    resizeSelected,
    setShapeSelected,
    toggleSnap: () => setSnapEnabled((v) => !v),
    toggleGrid: () => setShowGrid((v) => !v),
    undo: geometry.undo,
    redo: geometry.redo,
    save,
    discard: reset,
  };
};
