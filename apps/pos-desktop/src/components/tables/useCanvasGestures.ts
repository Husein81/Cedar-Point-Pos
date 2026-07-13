import { useCallback, useEffect, useRef } from "react";
import type { CanvasTransform } from "@/store/tableUiStore";

const MIN_SCALE = 0.25;
const MAX_SCALE = 3.5;
const WHEEL_ZOOM_INTENSITY = 0.0015;
const FIT_PADDING = 48;

export interface CanvasGesturesApi {
  /** Attach to the scrollable viewport element. */
  viewportRef: React.RefObject<HTMLDivElement | null>;
  /** Attach to the transformed world element. */
  worldRef: React.RefObject<HTMLDivElement | null>;
  getTransform: () => CanvasTransform;
  setTransform: (t: CanvasTransform) => void;
  zoomBy: (factor: number) => void;
  fitToBounds: (bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }) => void;
  /** Convert a screen (client) point to world coordinates. */
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
}

/**
 * Pan / wheel-zoom / two-finger-pinch for the floor canvas, hand-rolled on
 * pointer events. The transform lives in a ref and is applied directly to the
 * world element's style during gestures — React never re-renders on move.
 * `onGestureEnd` receives the final transform so callers can persist it.
 *
 * Gestures only start when the pointerdown target is the viewport/world
 * background itself (see the `e.target` check below) — not a table node.
 * This can't rely on the node's `stopPropagation()`: this hook's listeners
 * are attached with native `addEventListener` on an ancestor, so they fire
 * during native bubbling *before* React's synthetic dispatch (which runs
 * from the root) ever reaches the node's React `onPointerDown` handler.
 */
export const useCanvasGestures = (options: {
  initial?: CanvasTransform;
  onGestureEnd?: (t: CanvasTransform) => void;
  /** Disable single-pointer drag-to-pan (pinch/wheel zoom still work). Default true. */
  panEnabled?: boolean;
}): CanvasGesturesApi => {
  const { initial, onGestureEnd, panEnabled = true } = options;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<CanvasTransform>(
    initial ?? { x: 0, y: 0, scale: 1 },
  );
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
  } | null>(null);
  const isPanningRef = useRef(false);
  const onGestureEndRef = useRef(onGestureEnd);
  onGestureEndRef.current = onGestureEnd;
  const panEnabledRef = useRef(panEnabled);
  panEnabledRef.current = panEnabled;

  const apply = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    const { x, y, scale } = transformRef.current;
    world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  const setTransform = useCallback(
    (t: CanvasTransform) => {
      transformRef.current = {
        x: t.x,
        y: t.y,
        scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale)),
      };
      apply();
    },
    [apply],
  );

  const getTransform = useCallback(() => transformRef.current, []);

  /** Zoom so the given screen point stays fixed in world space. */
  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScaleRaw: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      const { x, y, scale } = transformRef.current;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScaleRaw));
      const ratio = nextScale / scale;

      transformRef.current = {
        x: px - (px - x) * ratio,
        y: py - (py - y) * ratio,
        scale: nextScale,
      };
      apply();
    },
    [apply],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      zoomAt(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        transformRef.current.scale * factor,
      );
      onGestureEndRef.current?.(transformRef.current);
    },
    [zoomAt],
  );

  const fitToBounds = useCallback(
    (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const worldWidth = bounds.maxX - bounds.minX;
      const worldHeight = bounds.maxY - bounds.minY;
      if (worldWidth <= 0 || worldHeight <= 0) return;

      const scale = Math.min(
        MAX_SCALE,
        Math.max(
          MIN_SCALE,
          Math.min(
            (rect.width - FIT_PADDING * 2) / worldWidth,
            (rect.height - FIT_PADDING * 2) / worldHeight,
          ),
        ),
      );

      setTransform({
        x: (rect.width - worldWidth * scale) / 2 - bounds.minX * scale,
        y: (rect.height - worldHeight * scale) / 2 - bounds.minY * scale,
        scale,
      });
      onGestureEndRef.current?.(transformRef.current);
    },
    [setTransform],
  );

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    const { x, y, scale } = transformRef.current;
    const rect = viewport?.getBoundingClientRect();
    const px = clientX - (rect?.left ?? 0);
    const py = clientY - (rect?.top ?? 0);
    return { x: (px - x) / scale, y: (py - y) / scale };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_INTENSITY);
      zoomAt(e.clientX, e.clientY, transformRef.current.scale * factor);
      onGestureEndRef.current?.(transformRef.current);
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Only start a gesture (and capture the pointer) when it targets the
      // canvas background itself. Otherwise capturing here would redirect
      // the table node's pointerup/click to the viewport and silently
      // swallow the click.
      if (e.target !== viewport && e.target !== worldRef.current) return;

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      viewport.setPointerCapture(e.pointerId);

      if (pointersRef.current.size === 1) {
        isPanningRef.current = panEnabledRef.current;
      } else if (pointersRef.current.size === 2) {
        // Entering pinch: freeze pan, record baseline distance.
        isPanningRef.current = false;
        const [a, b] = [...pointersRef.current.values()];
        if (a && b) {
          pinchStartRef.current = {
            distance: Math.hypot(b.x - a.x, b.y - a.y),
            scale: transformRef.current.scale,
          };
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const previous = pointersRef.current.get(e.pointerId);
      if (!previous) return;
      const current = { x: e.clientX, y: e.clientY };
      pointersRef.current.set(e.pointerId, current);

      if (pointersRef.current.size === 2 && pinchStartRef.current) {
        const [a, b] = [...pointersRef.current.values()];
        if (!a || !b) return;
        const distance = Math.hypot(b.x - a.x, b.y - a.y);
        if (pinchStartRef.current.distance > 0) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          zoomAt(
            midX,
            midY,
            pinchStartRef.current.scale *
              (distance / pinchStartRef.current.distance),
          );
        }
        return;
      }

      if (isPanningRef.current) {
        transformRef.current = {
          ...transformRef.current,
          x: transformRef.current.x + (current.x - previous.x),
          y: transformRef.current.y + (current.y - previous.y),
        };
        apply();
      }
    };

    const endPointer = (e: PointerEvent) => {
      if (!pointersRef.current.delete(e.pointerId)) return;
      if (pointersRef.current.size < 2) pinchStartRef.current = null;
      if (pointersRef.current.size === 0) {
        const wasGesturing = isPanningRef.current;
        isPanningRef.current = false;
        if (wasGesturing) onGestureEndRef.current?.(transformRef.current);
      }
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointermove", handlePointerMove);
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("pointerdown", handlePointerDown);
      viewport.removeEventListener("pointermove", handlePointerMove);
      viewport.removeEventListener("pointerup", endPointer);
      viewport.removeEventListener("pointercancel", endPointer);
    };
  }, [apply, zoomAt]);

  // Apply the initial transform on mount.
  useEffect(() => {
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    viewportRef,
    worldRef,
    getTransform,
    setTransform,
    zoomBy,
    fitToBounds,
    screenToWorld,
  };
};
