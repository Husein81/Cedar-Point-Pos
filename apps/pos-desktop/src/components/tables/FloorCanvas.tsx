import { useCallback, useEffect, useMemo } from "react";
import { Button, Empty, cn } from "@repo/ui";
import type { TableOverview } from "@/dto/tables.dto";
import { useTableUiStore } from "@/store/tableUiStore";
import { getFloorBounds, resolveTablePositions } from "./autoLayout";
import { FloorEditorToolbar } from "./FloorEditorToolbar";
import { TableNode, type TableNodeAction } from "./TableNode";
import { useCanvasGestures } from "./useCanvasGestures";
import { useElapsedNow } from "./useElapsedNow";
import { GRID_SIZE, useFloorEditor } from "./useFloorEditor";

const WORLD_SIZE = 6000;

interface FloorCanvasProps {
  /** Tables of the active floor (already floor-filtered, NOT search-filtered). */
  tables: TableOverview[];
  /** Ids matching the active search/status filters — the rest render dimmed. */
  matchedIds: Set<string>;
  selectedTableId: string | null;
  canManage: boolean;
  /** Remount the canvas with a new key per floor; used for transform memory. */
  floorKey: string;
  isEditing: boolean;
  onSelect: (tableId: string) => void;
  onAction: (table: TableOverview, action: TableNodeAction) => void;
}

/**
 * The interactive floor plan: pan/zoom viewport (gesture math in
 * useCanvasGestures, applied outside React), absolutely-positioned table
 * nodes, and — in manager mode — the drag/rotate/resize floor editor.
 */
export function FloorCanvas({
  tables,
  matchedIds,
  selectedTableId,
  canManage,
  floorKey,
  isEditing,
  onSelect,
  onAction,
}: FloorCanvasProps) {
  const now = useElapsedNow();
  const storedTransform = useTableUiStore((s) => s.transforms[floorKey]);
  const setStoredTransform = useTableUiStore((s) => s.setTransform);

  const gestures = useCanvasGestures({
    initial: storedTransform,
    onGestureEnd: (t) => setStoredTransform(floorKey, t),
  });

  const basePositions = useMemo(() => resolveTablePositions(tables), [tables]);

  const editor = useFloorEditor({ tables, basePositions, gestures });

  // First view of a floor: fit the whole plan into the viewport.
  useEffect(() => {
    if (storedTransform) return;
    const bounds = getFloorBounds(tables, basePositions);
    if (bounds) gestures.fitToBounds(bounds);
    // Only on mount — the canvas is remounted per floor via `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFit = useCallback(() => {
    const bounds = getFloorBounds(tables, basePositions);
    if (bounds) gestures.fitToBounds(bounds);
  }, [basePositions, gestures, tables]);

  const handleSelect = useCallback(
    (tableId: string) => {
      if (isEditing) editor.selectForEditing(tableId);
      else onSelect(tableId);
    },
    [editor, isEditing, onSelect],
  );

  if (tables.length === 0) {
    return (
      <div className="bg-muted/20 flex h-full items-center justify-center rounded-xl border">
        <Empty
          icon="LayoutGrid"
          title="No tables on this floor"
          description="Add tables or pick another floor to see the plan."
        />
      </div>
    );
  }

  const showGrid = isEditing && editor.showGrid;

  return (
    <div className="relative h-full overflow-hidden rounded-xl border">
      {/* Viewport — owns all pan/zoom gestures. */}
      <div
        ref={gestures.viewportRef}
        className={cn(
          "bg-muted/20 h-full w-full touch-none overflow-hidden",
          isEditing ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        )}
      >
        {/* World — transformed via style only (no React re-render on pan). */}
        <div
          ref={gestures.worldRef}
          className="relative origin-top-left"
          style={{
            width: WORLD_SIZE,
            height: WORLD_SIZE,
            backgroundImage: showGrid
              ? "radial-gradient(circle, var(--border) 1.5px, transparent 1.5px)"
              : undefined,
            backgroundSize: showGrid
              ? `${GRID_SIZE * 2}px ${GRID_SIZE * 2}px`
              : undefined,
          }}
        >
          {tables.map((table) => {
            const geometry = isEditing ? editor.getGeometry(table) : null;
            const base = basePositions.get(table.id) ?? { x: 0, y: 0 };
            const isSelected = isEditing
              ? editor.editorSelectedId === table.id
              : selectedTableId === table.id;

            return (
              <TableNode
                key={table.id}
                table={
                  geometry
                    ? {
                        ...table,
                        width: geometry.width,
                        height: geometry.height,
                        rotation: geometry.rotation,
                        shape: geometry.shape ?? table.shape,
                      }
                    : table
                }
                x={geometry ? geometry.x : base.x}
                y={geometry ? geometry.y : base.y}
                isSelected={isSelected}
                isEditing={isEditing}
                isDimmed={!isEditing && !matchedIds.has(table.id)}
                canManage={canManage}
                now={now}
                onSelect={handleSelect}
                onAction={onAction}
                onDragStart={editor.startDrag}
              />
            );
          })}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="bg-card/95 absolute right-3 bottom-3 flex flex-col gap-1 rounded-lg border p-1 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="icon-sm"
          iconName="Plus"
          aria-label="Zoom in"
          onClick={() => gestures.zoomBy(1.25)}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          iconName="Minus"
          aria-label="Zoom out"
          onClick={() => gestures.zoomBy(0.8)}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          iconName="Maximize"
          aria-label="Fit floor to view"
          onClick={handleFit}
        />
      </div>

      {/* Manager floor editor toolbar */}
      {isEditing && <FloorEditorToolbar editor={editor} />}
    </div>
  );
}
