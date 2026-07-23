import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@repo/ui";
import type { Customer } from "@/shared/models";

type Handlers = {
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
};

export const getCustomerColumns = ({
  onEdit,
  onDelete,
}: Handlers): ColumnDef<Customer>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.phone ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.email ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.address ?? "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          iconName="Pencil"
          onClick={() => onEdit(row.original)}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          iconName="Trash2"
          onClick={() => onDelete(row.original)}
        />
      </div>
    ),
  },
];
