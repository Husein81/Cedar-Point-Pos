import TitleBar from "@/components/title-bar";
import { StockAdjustmentForm } from "@/components/stock/StockAdjustmentForm";
import { stockColumns } from "@/constants/columns/stockColumn";
import { inventoryHistoryColumns } from "@/constants/columns/inventoryHistoryColumn";
import {
  useInventoryByBranch,
  useLowStock,
  useInventoryHistoryByBranch,
} from "@/hooks/useStock";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { Badge, Button, DataTable, Icon, Shad } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/stock")({
  component: RouteComponent,
});

function RouteComponent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const { branchId } = useBranchStore();

  const {
    data: inventoryResponse,
    isLoading,
    refetch,
  } = useInventoryByBranch(branchId!, {
    page: String(page),
    limit: String(pageSize),
  });
  const { data: lowStockResponse } = useLowStock(branchId!);
  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useInventoryHistoryByBranch(branchId!, {
    page: historyPage,
    limit: historyPageSize,
  });
  const { openModal } = useModalStore();

  const inventory = inventoryResponse?.data || [];
  const lowStockItems = lowStockResponse?.data || [];
  const historyData = historyResponse?.data || [];
  const historyPagination = historyResponse?.pagination;

  const handleStockAdjustment = () => {
    openModal(
      "Stock Adjustment",
      <StockAdjustmentForm branchId={branchId ?? ""} />,
    );
  };

  // Calculate stats
  const totalProducts = inventory.length;
  const outOfStock = inventory.filter((item) => Number(item.stock) <= 0).length;
  const lowStock = lowStockItems.length;
  const inStock = inventory.filter(
    (item) => Number(item.stock) > Number(item.minStock),
  ).length;

  // Calculate pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const inventoryData = inventory.slice(startIndex, endIndex);
  const totalPages = Math.ceil(inventory.length / pageSize);

  const stats = [
    {
      title: "Total Products",
      value: totalProducts,
      icon: "Package",
    },
    {
      title: "In Stock",
      value: inStock,
      icon: "Package",
    },
    {
      title: "Low Stock",
      value: lowStock,
      icon: "TriangleAlert",
    },
    {
      title: "Out of Stock",
      value: outOfStock,
      icon: "PackageOpen",
    },
  ];

  const handleStockPageSizeChange = (pageSize: number) => {
    setPageSize(pageSize);
    setPage(1);
  };

  const handleHistoryPageSizeChange = (pageSize: number) => {
    setHistoryPageSize(pageSize);
    setHistoryPage(1);
  };

  return (
    <div className="space-y-4 pt-4">
      <TitleBar
        title={"Stock Management"}
        subtitle={"Manage your stock levels"}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StockCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStock > 0 && (
        <Badge className="p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-3">
          <Icon
            name="TriangleAlert"
            className="h-5 w-5 text-orange-500 mt-0.5"
          />
          <div>
            <p className="font-medium text-orange-900 dark:text-orange-100">
              Low Stock Warning
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {lowStock} product{lowStock > 1 ? "s" : ""} running low on stock.
              Consider restocking soon.
            </p>
          </div>
        </Badge>
      )}

      <DataTable
        columns={stockColumns}
        data={inventoryData}
        isLoading={isLoading}
        onRefetch={refetch}
        actions={
          <Button onClick={handleStockAdjustment} iconName="Plus">
            Stock Adjustment
          </Button>
        }
        pagination={{
          rows: inventoryResponse?.pagination.totalCount || 0,
          page,
          pageSize,
          totalPages,
          onPageChange: setPage,
          onPageSizeChange: handleStockPageSizeChange,
        }}
      />

      {/* Inventory History Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Inventory History</h2>
            <p className="text-sm text-muted-foreground">
              Track all stock movements and adjustments
            </p>
          </div>
        </div>

        <DataTable
          columns={inventoryHistoryColumns}
          data={historyData}
          isLoading={isHistoryLoading}
          onRefetch={refetchHistory}
          pagination={{
            rows: historyPagination?.totalCount || 0,
            page: historyPage,
            pageSize: historyPageSize,
            totalPages: historyPagination?.totalPages || 1,
            onPageChange: setHistoryPage,
            onPageSizeChange: handleHistoryPageSizeChange,
          }}
        />
      </div>
    </div>
  );
}

function StockCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <Shad.Card>
      <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Shad.CardTitle className="text-sm font-medium">{title}</Shad.CardTitle>
        <Icon name={icon} className="h-4 w-4 text-muted-foreground" />
      </Shad.CardHeader>
      <Shad.CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </Shad.CardContent>
    </Shad.Card>
  );
}
