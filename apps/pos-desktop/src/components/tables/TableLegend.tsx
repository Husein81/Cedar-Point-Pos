import { Icon, cn } from "@repo/ui";
import { TABLE_UI_STATUSES, TABLE_UI_STATUS_CONFIG } from "./config";

export function TableLegend() {
  return (
    <div className="space-y-1.5">
      {TABLE_UI_STATUSES.map((status) => {
        const config = TABLE_UI_STATUS_CONFIG[status];
        return (
          <div
            key={status}
            className="text-muted-foreground flex items-center gap-2 text-xs"
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
            <Icon name={config.icon} className="h-3.5 w-3.5" />
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
