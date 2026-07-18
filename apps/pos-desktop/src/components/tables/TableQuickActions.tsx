import { memo, useCallback, useMemo } from "react";
import { Button } from "@repo/ui";
import type { TableOverview } from "@/dto/tables.dto";
import type { TableNodeAction } from "./TableNode";
import { getVisibleActions, type TableUiStatus } from "./config";

interface TableQuickActionsProps {
  table: TableOverview;
  uiStatus: TableUiStatus;
  canManage: boolean;
  onAction: (table: TableOverview, action: TableNodeAction) => void;
}

export const TableQuickActions = memo(function TableQuickActions({
  table,
  uiStatus,
  canManage,
  onAction,
}: TableQuickActionsProps) {
  const actions = useMemo(
    () => getVisibleActions(uiStatus, canManage, table.activeOrder?.paymentStatus),
    [uiStatus, canManage, table.activeOrder?.paymentStatus],
  );

  const handleActionClick = useCallback(
    (action: TableNodeAction) => onAction(table, action),
    [table, onAction],
  );

  const handleEditClick = useCallback(
    () => onAction(table, "edit"),
    [table, onAction],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((spec, index) => (
          <Button
            key={spec.action}
            variant={spec.variant ?? "default"}
            iconName={spec.icon}
            className={
              index === 0 && actions.length % 2 === 1 ? "col-span-2" : ""
            }
            onClick={() => handleActionClick(spec.action)}
          >
            {spec.label}
          </Button>
        ))}
      </div>
      {canManage && uiStatus !== "DISABLED" && (
        <Button
          variant="ghost"
          size="sm"
          iconName="Pencil"
          className="text-muted-foreground"
          onClick={handleEditClick}
        >
          Edit Table
        </Button>
      )}
    </div>
  );
});
