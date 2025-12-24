import { ColumnDef } from "@tanstack/react-table";
import { Button, Badge, Shad } from "@repo/ui";
import { MoreVertical } from "lucide-react";
import { Product } from "@repo/types";

export const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => `${row.original.price.toLocaleString()} LBP`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "ACTIVE" ? "default" : "destructive"}
      >
        {row.original.status.replace("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "stock",
    header: "Stock",
  },
  {
    id: "actions",
    header: "",
    cell: () => (
      <Shad.DropdownMenu>
        <Shad.DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </Shad.DropdownMenuTrigger>
        <Shad.DropdownMenuContent align="end">
          <Shad.DropdownMenuItem>Edit</Shad.DropdownMenuItem>
          <Shad.DropdownMenuItem>Duplicate</Shad.DropdownMenuItem>
          <Shad.DropdownMenuItem className="text-destructive">
            Delete
          </Shad.DropdownMenuItem>
        </Shad.DropdownMenuContent>
      </Shad.DropdownMenu>
    ),
  },
];
