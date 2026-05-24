import { useUpdateTableStatus } from "@/hooks/useTable";
import { TableStatus } from "@repo/types";
import { cn, Icon, Shad } from "@repo/ui";
import { STATUS_OPTIONS } from "./config";

export default function TableStatusDropdown({
  tableId,
  status,
}: {
  tableId: string;
  status: TableStatus;
}) {
  const updateStatusMutation = useUpdateTableStatus();

  const handleStatusChange = (newStatus: TableStatus) => {
    if (newStatus === status) return;

    updateStatusMutation.mutate({
      id: tableId,
      status: newStatus,
    });
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger asChild>
        <button
          data-dropdown="true"
          className={cn(
            "px-3.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-xs cursor-pointer select-none transition-all active:scale-95 outline-hidden",
            status === "AVAILABLE" &&
              "bg-[#27AE60] text-white hover:bg-[#219653]",
            status === "OCCUPIED" &&
              "bg-[#EB5757] text-white hover:bg-[#c53e3e]",
            status === "RESERVED" &&
              "bg-[#9B51E0] text-white hover:bg-[#823bb5]",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {status === "AVAILABLE" && "Available"}
          {status === "OCCUPIED" && "Occupied"}
          {status === "RESERVED" && "Reserved"}
        </button>
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent
        align="start"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
      >
        <Shad.DropdownMenuLabel className="text-xs text-muted-foreground">
          Quick Status
        </Shad.DropdownMenuLabel>
        <Shad.DropdownMenuSeparator />
        {STATUS_OPTIONS.map((option) => (
          <Shad.DropdownMenuItem
            key={option.value}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors",
              "focus:bg-accent focus:text-accent-foreground",
              option.value === status && "bg-accent/50 font-semibold",
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange(option.value);
            }}
            disabled={option.value === status || updateStatusMutation.isPending}
          >
            <div
              className={cn(
                "h-2 w-2 rounded-full ring-2 ring-offset-2 ring-transparent transition-all",
                option.value === "AVAILABLE"
                  ? "bg-emerald-500"
                  : option.value === "OCCUPIED"
                    ? "bg-red-500"
                    : "bg-purple-500",
                option.value === status &&
                  (option.value === "AVAILABLE"
                    ? "ring-emerald-500/30"
                    : option.value === "OCCUPIED"
                      ? "ring-red-500/30"
                      : "ring-purple-500/30"),
              )}
            />
            <span className="flex-1">{option.label}</span>
            {option.value === status && (
              <Icon
                name="Check"
                className="h-4 w-4 text-primary animate-in zoom-in duration-200"
              />
            )}
          </Shad.DropdownMenuItem>
        ))}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
}
