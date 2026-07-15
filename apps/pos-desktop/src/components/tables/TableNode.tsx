import { memo, useCallback } from "react";
import { Icon, Shad, cn } from "@repo/ui";
import type { TableOverview } from "@/dto/tables.dto";
import {
  TABLE_SHAPE_CONFIG,
  TABLE_UI_STATUS_CONFIG,
  DEFAULT_TABLE_SHAPE,
  deriveTableUiStatus,
  formatElapsedSince,
  formatTableMoney,
  getTableSize,
  MENU_BY_STATUS,
} from "./config";

export type TableNodeAction =
  | "open"
  | "free"
  | "seat"
  | "reserve"
  | "unreserve"
  | "complete"
  | "transfer"
  | "edit"
  | "disable"
  | "enable"
  | "delete";

interface TableNodeProps {
  table: TableOverview;
  x: number;
  y: number;
  isSelected: boolean;
  /** Editor mode: node is draggable, click-select and context menu disabled. */
  isEditing: boolean;
  /** Dimmed when it doesn't match the active filters (kept for spatial stability). */
  isDimmed: boolean;
  /** Whether the current user can manage tables (edit/disable/delete). */
  canManage: boolean;
  /** Shared elapsed-time tick (see useElapsedNow). */
  now: number;
  onSelect: (tableId: string) => void;
  onAction: (table: TableOverview, action: TableNodeAction) => void;
  /** Editor drag start (pointer capture handled by the floor editor). */
  onDragStart?: (tableId: string, e: React.PointerEvent) => void;
}

/**
 * One table on the floor canvas. Absolutely positioned in world coordinates;
 * memoized so pan/zoom (which never re-renders React) and unrelated table
 * updates don't touch it.
 */
export const TableNode = memo(function TableNode({
  table,
  x,
  y,
  isSelected,
  isEditing,
  isDimmed,
  canManage,
  now,
  onSelect,
  onAction,
  onDragStart,
}: TableNodeProps) {
  const uiStatus = deriveTableUiStatus(table, table.activeOrder?.status);
  const statusConfig = TABLE_UI_STATUS_CONFIG[uiStatus];
  const shape = table.shape ?? DEFAULT_TABLE_SHAPE;
  const shapeConfig = TABLE_SHAPE_CONFIG[shape];
  const { width, height } = getTableSize(table);
  const rotation = table.rotation ?? 0;
  const isCompact = width < 110 || height < 110;
  const order = table.activeOrder;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Keep the canvas from starting a pan underneath the node.
      e.stopPropagation();
      if (isEditing) onDragStart?.(table.id, e);
    },
    [isEditing, onDragStart, table.id],
  );

  const handleClick = useCallback(() => {
    if (!isEditing) onSelect(table.id);
  }, [isEditing, onSelect, table.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(table.id);
      }
    },
    [isEditing, onSelect, table.id],
  );

  const node = (
    <div
      role="button"
      tabIndex={isEditing ? -1 : 0}
      aria-label={`Table ${table.tableNumber} — ${statusConfig.label}`}
      data-table-id={table.id}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute flex select-none flex-col items-center justify-center border-2 shadow-xs outline-none",
        "transition-[box-shadow,border-color,opacity] duration-200",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
        shapeConfig.className,
        statusConfig.node,
        isSelected && "ring-primary shadow-lg ring-2 ring-offset-2",
        isDimmed && "opacity-30",
        isEditing ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
      )}
      style={{
        left: x,
        top: y,
        width,
        height,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
    >
      {/* Counter-rotate so text stays horizontal whatever the shape does. */}
      <div
        className="flex max-h-full max-w-full flex-col items-center justify-center gap-0.5 overflow-hidden px-2 text-center"
        style={{
          transform: rotation ? `rotate(${-rotation}deg)` : undefined,
        }}
      >
        <div className="flex items-center gap-1.5">
          <Icon
            name={statusConfig.icon}
            className={cn("h-3.5 w-3.5 shrink-0", statusConfig.text)}
          />
          <span className="text-foreground text-lg leading-none font-bold">
            {table.tableNumber}
          </span>
        </div>

        {!isCompact && (
          <>
            <div className="text-muted-foreground flex items-center gap-1 text-[11px] leading-tight">
              <Icon name="Users" className="h-3 w-3" />
              <span>
                {order?.guestCount ?? 0}/{table.capacity}
              </span>
            </div>

            {order ? (
              <div
                className={cn(
                  "flex items-center gap-2 text-[11px] leading-tight font-medium",
                  statusConfig.text,
                )}
              >
                <span className="flex items-center gap-0.5">
                  <Icon name="Timer" className="h-3 w-3" />
                  {formatElapsedSince(order.createdAt, now)}
                </span>
                <span>{formatTableMoney(order.total)}</span>
              </div>
            ) : (
              <span
                className={cn(
                  "text-[11px] leading-tight font-medium",
                  statusConfig.text,
                )}
              >
                {statusConfig.label}
              </span>
            )}

            {order?.userName && (
              <span className="text-muted-foreground max-w-full truncate text-[10px] leading-tight">
                {order.userName}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Editor mode: raw node (no context menu, drag owns the pointer).
  if (isEditing) return node;

  const entries = MENU_BY_STATUS[uiStatus].filter(
    (entry) => !entry.managerOnly || canManage,
  );

  return (
    <Shad.ContextMenu>
      <Shad.ContextMenuTrigger asChild>{node}</Shad.ContextMenuTrigger>
      <Shad.ContextMenuContent className="w-52">
        <Shad.ContextMenuLabel>
          Table {table.tableNumber} · {statusConfig.label}
        </Shad.ContextMenuLabel>
        <Shad.ContextMenuSeparator />
        {entries.map((entry) => (
          <Shad.ContextMenuItem
            key={entry.action}
            variant={entry.destructive ? "destructive" : "default"}
            onSelect={() => onAction(table, entry.action)}
          >
            <Icon name={entry.icon} className="h-4 w-4" />
            {entry.label}
          </Shad.ContextMenuItem>
        ))}
      </Shad.ContextMenuContent>
    </Shad.ContextMenu>
  );
});
