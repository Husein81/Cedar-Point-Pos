import { ColumnDef } from "@tanstack/react-table";
import { Badge, Button } from "@repo/ui";
import type { TransferWithDetails } from "@/apis/transfersApi";
import { useModalStore } from "@/store/modalStore";
import { TransferDetailsModal } from "@/components/stock/TransferDetailsModal";
import { format } from "date-fns";
import { Eye } from "lucide-react";

function StatusBadge({ status }: { status: TransferWithDetails["status"] }) {
  if (status === "COMPLETED") {
    return <Badge className="bg-green-500 text-white">Completed</Badge>;
  }
  if (status === "CANCELLED") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }
  return (
    <Badge variant="outline" className="text-orange-500 border-orange-400">
      Pending
    </Badge>
  );
}

function ActionCell({ transfer }: { transfer: TransferWithDetails }) {
  const { openModal } = useModalStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      title="View transfer details"
      onClick={() =>
        openModal(
          "Transfer Details",
          <TransferDetailsModal transfer={transfer} />
        )
      }
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
}

export const transferColumns: ColumnDef<TransferWithDetails>[] = [
  {
    accessorKey: "id",
    header: "Transfer ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        #{row.original.id.substring(0, 8).toUpperCase()}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd MMM yyyy, HH:mm"),
  },
  {
    id: "from",
    header: "From Branch",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.fromBranch?.name ?? "—"}
      </span>
    ),
  },
  {
    id: "to",
    header: "To Branch",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.toBranch?.name ?? "—"}
      </span>
    ),
  },
  {
    id: "items",
    header: "Items",
    cell: ({ row }) => {
      const items = row.original.items ?? [];
      const totalQty = items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      );
      return (
        <span className="text-sm">
          {items.length} product{items.length !== 1 ? "s" : ""} · {totalQty}{" "}
          qty
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "requestor",
    header: "Requested By",
    cell: ({ row }) =>
      row.original.requestor?.name ?? (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionCell transfer={row.original} />,
  },
];
