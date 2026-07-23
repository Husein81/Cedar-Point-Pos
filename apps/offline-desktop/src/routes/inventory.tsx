import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge, Button, DataTable, Icon } from "@repo/ui";
import { AdjustStockDialog } from "@/components/inventory/AdjustStockDialog";
import { getStockMovementColumns } from "@/components/inventory/stockMovementColumns";
import { useStockMovements } from "@/hooks/useInventory";
import { useLowStockProducts } from "@/hooks/useProduct";
import { usePagination } from "@/hooks/usePagination";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { page, pageSize, setPage, onPageSizeChange } = usePagination({});
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const { data, isLoading, refetch } = useStockMovements({ page, pageSize });
  const { data: lowStock } = useLowStockProducts();

  const columns = getStockMovementColumns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Stock movements, adjustments and low stock alerts
          </p>
        </div>
        <Button
          iconName="SlidersHorizontal"
          onClick={() => setIsAdjustOpen(true)}
        >
          Adjust Stock
        </Button>
      </div>

      {/* Low stock alerts */}
      {lowStock && lowStock.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium flex items-center gap-2 text-destructive mb-2">
            <Icon name="TriangleAlert" className="w-4 h-4" />
            Low stock ({lowStock.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((product) => (
              <Badge key={product.id} variant="outline">
                {product.name}: {product.stock}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRefetch={refetch}
        search={{ keys: ["productName", "reason"] }}
        pagination={{
          rows: data?.total ?? 0,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
          onPageChange: setPage,
          onPageSizeChange,
        }}
      />

      <AdjustStockDialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen} />
    </div>
  );
}
