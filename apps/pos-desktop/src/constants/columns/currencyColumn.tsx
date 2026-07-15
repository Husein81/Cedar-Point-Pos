import { ColumnDef } from "@tanstack/react-table";
import type { TenantCurrency } from "@repo/types";
import { Checkbox, Badge, Icon } from "@repo/ui";
import { CurrencyActions } from "@/components/currency/CurrencyActions";

export const getCurrencyColumns = (
  baseCurrencyCode: string,
): ColumnDef<TenantCurrency & { searchName: string }>[] => [
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
    accessorKey: "currencyCode",
    header: "Code",
    cell: ({ row }) => {
      const isBase = row.original.currencyCode === baseCurrencyCode;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.currencyCode}</span>
          {isBase && (
            <Badge variant="secondary" className="text-xs">
              <Icon name="Star" className="w-3 h-3 mr-1" />
              Base
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "currency.name",
    header: "Name",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.currency?.name || "—"}
      </div>
    ),
  },
  {
    accessorKey: "currency.symbol",
    header: "Symbol",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400 font-medium">
        {row.original.currency?.symbol || "—"}
      </div>
    ),
  },
  {
    accessorKey: "exchangeRate",
    header: "Exchange Rate",
    cell: ({ row }) => {
      const rate = parseFloat(row.original.exchangeRate?.toString() || "0");
      const decimalPlaces = row.original.currency?.decimalPlaces ?? 2;
      const isBase = row.original.currencyCode === baseCurrencyCode;
      return (
        <div className="font-mono">
          {isBase ? (
            <span className="text-muted-foreground">1.00</span>
          ) : (
            rate.toFixed(decimalPlaces)
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => {
      const date = row.original.updatedAt
        ? new Date(row.original.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—";
      return <div className="text-gray-600 dark:text-gray-400">{date}</div>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <CurrencyActions
        tenantCurrency={row.original}
        baseCurrencyCode={baseCurrencyCode}
      />
    ),
  },
];
