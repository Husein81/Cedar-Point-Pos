import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@repo/ui";
import { CustomerActions } from "@/components/customer/CustomerActions";
import type { CustomerDetails } from "@/dto/customer.dto";

export const getCustomerColumns = (): ColumnDef<CustomerDetails>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.phone || "—"}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.email || "—"}
      </div>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
        {row.original.address || "—"}
      </div>
    ),
  },
  {
    accessorKey: "orderCount",
    header: "Orders",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.orderCount}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <CustomerActions customer={row.original} />,
  },
];
