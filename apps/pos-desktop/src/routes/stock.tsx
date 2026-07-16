import TitleBar from "@/components/title-bar";
import { StockAdjustmentForm } from "@/components/stock/StockAdjustmentForm";
import { TransfersList } from "@/components/stock/TransfersList";
import { stockColumns } from "@/components/stock/columns/stockColumn";
import { inventoryHistoryColumns } from "@/components/stock/columns/inventoryHistoryColumn";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
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
import { useAuthStore } from "@/store/authStore";
import { useBranchesByTenant } from "@/hooks/useBranch";

export const Route = createFileRoute("/stock")({
  component: RouteComponent,
});

function RouteComponent() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { user } = useAuthStore();
  const { branchId } = useBranchStore();
  const { data: branches = [] } = useBranchesByTenant(user?.tenantId);

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
  const inventoryData = inventory.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(inventory.length / pageSize);

  const stats = [
    { title: "Total Products", value: totalProducts, icon: "Package" },
    { title: "In Stock", value: inStock, icon: "Package" },
    { title: "Low Stock", value: lowStock, icon: "TriangleAlert" },
    { title: "Out of Stock", value: outOfStock, icon: "PackageOpen" },
  ];

  const handleStockPageSizeChange = (pageSize: number) => {
    setPageSize(pageSize);
    setPage(1);
  };

  const handleHistoryPageSizeChange = (pageSize: number) => {
    setHistoryPageSize(pageSize);
    setHistoryPage(1);
  };

  const tabs = [
    { id: "inventory", label: "Inventory", icon: "Package" },
    { id: "history", label: "History", icon: "History" },
    { id: "transfers", label: "Transfers", icon: "ArrowLeftRight" },
  ];

  return (
    <div className="space-y-4 pt-4">
      <TitleBar
        title={"Stock Management"}
        subtitle={"Manage your stock levels and branch transfers"}
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b">
        {tabs
          .filter((tab) => branches.length > 1 || tab.id !== "transfers")
          .map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
      </div>

      {/* Tab Content */}
      {activeTab === "inventory" && (
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
      )}

      {activeTab === "history" && (
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
      )}

      {activeTab === "transfers" && <TransfersList />}
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
