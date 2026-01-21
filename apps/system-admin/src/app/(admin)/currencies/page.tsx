"use client";

import { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/Header";
import { useCurrencies } from "@/hooks/currency";
import { DataTable, Button, Shad, Icon } from "@repo/ui";
import type { Currency } from "@repo/types";
import { CurrencyDialog } from "@/components/currencies/CurrencyDialog";

export default function CurrenciesPage() {
  const { data: currencies = [], isLoading, refetch } = useCurrencies();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    null
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered currencies
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) return currencies;
    const query = searchQuery.toLowerCase();
    return currencies.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query)
    );
  }, [currencies, searchQuery]);

  // Table columns
  const columns: ColumnDef<Currency>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <div className="font-mono font-medium">{row.original.code}</div>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <div className="text-lg font-medium">
            {row.original.symbol || "—"}
          </div>
        ),
      },
      {
        accessorKey: "decimalPlaces",
        header: "Decimal Places",
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.original.decimalPlaces ?? 2}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const currency = row.original;
          return (
            <Shad.DropdownMenu>
              <Shad.DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground">
                  <Icon name="Ellipsis" size={16} />
                  <span className="sr-only">Actions</span>
                </button>
              </Shad.DropdownMenuTrigger>
              <Shad.DropdownMenuContent align="end">
                <Shad.DropdownMenuLabel>Actions</Shad.DropdownMenuLabel>
                <Shad.DropdownMenuSeparator />
                <Shad.DropdownMenuItem
                  onClick={() => {
                    setSelectedCurrency(currency);
                    setEditDialogOpen(true);
                  }}
                >
                  <Icon name="SquarePen" size={14} className="mr-2" />
                  Edit Currency
                </Shad.DropdownMenuItem>
              </Shad.DropdownMenuContent>
            </Shad.DropdownMenu>
          );
        },
      },
    ],
    []
  );

  return (
    <>
      <Header
        title="Currencies"
        description="Manage the global currency reference table. These currencies are available for all tenants to configure."
      />

      <main className="flex-1 p-6 overflow-auto bg-white">
        <div className="space-y-6">
          {/* Stats */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
              <Icon name="Coins" className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                Total Currencies:
              </span>
              <span className="font-medium">{currencies.length}</span>
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Icon
              name="Info"
              className="w-5 h-5 text-blue-600 mt-0.5 shrink-0"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">
                Global Currency Reference
              </p>
              <p className="text-sm text-blue-700">
                This is the master list of currencies available in the system.
                Tenants can configure their own currencies from this list and
                set their own exchange rates. Adding a currency here makes it
                available for all tenants.
              </p>
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={filteredCurrencies}
            isLoading={isLoading}
            onRefetch={refetch}
            actions={
              <Button onClick={() => setCreateDialogOpen(true)} iconName="Plus">
                Add Currency
              </Button>
            }
            search={{
              term: searchQuery,
              onTermChange: setSearchQuery,
              keys: ["code", "name"],
            }}
          />
        </div>
      </main>

      {/* Create Currency Dialog */}
      <CurrencyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Currency Dialog */}
      {selectedCurrency && (
        <CurrencyDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedCurrency(null);
          }}
          currency={selectedCurrency}
        />
      )}
    </>
  );
}
