import { useCallback, useRef } from "react";
import type { CanvasGesturesApi } from "./useCanvasGestures";
import type { DraftGeometry } from "./useDraftGeometry";

export const GRID_SIZE = 20;

const snap = (value: number, enabled: boolean): number =>
  enabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : Math.round(value);

export interface TableDragApi {
  startDrag: (tableId: string, e: React.PointerEvent) => void;
}

/**
 * Translates raw pointer events into draft geometry updates for the actively
 * dragged table: zoom-scale compensation (via `gestures.getTransform`), grid
 * snapping, and a single history checkpoint per drag rather than per pixel.
 * Knows nothing about tables, selection, or history storage — those are
 * supplied as callbacks so this hook stays a pure input-translation layer.
 */
export const useTableDrag = (options: {
  gestures: CanvasGesturesApi;
  snapEnabled: boolean;
  /** Resolve the geometry a drag should start from; return undefined to abort. */
  getOrigin: (tableId: string) => DraftGeometry | undefined;
  onSelect: (tableId: string) => void;
  /** Called once, on the first real pointer movement of a drag. */
  onDragBegin: () => void;
  onDragMove: (tableId: string, geometry: DraftGeometry) => void;
}): TableDragApi => {
  const {
    gestures,
    snapEnabled,
    getOrigin,
    onSelect,
    onDragBegin,
    onDragMove,
  } = options;

  const dragRef = useRef<{
    tableId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origin: DraftGeometry;
    moved: boolean;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  const startDrag = useCallback(
    (tableId: string, e: React.PointerEvent) => {
      const origin = getOrigin(tableId);
      if (!origin) return;
      onSelect(tableId);

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
          onDragBegin();
        }

        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          onDragMove(drag.tableId, {
            ...drag.origin,
            x: snap(drag.origin.x + dx, snapEnabled),
            y: snap(drag.origin.y + dy, snapEnabled),
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
    [getOrigin, gestures, onDragBegin, onDragMove, onSelect, snapEnabled],
  );

  return { startDrag };
};
