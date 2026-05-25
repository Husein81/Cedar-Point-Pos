import { SkeletonCard } from "@/components/common/SkeletonCard";
import GridPagination from "@/components/grid-pagination";
import TitleBar from "@/components/title-bar";
import {
  KitchenCard,
  KitchenFilters,
  type KitchenFilters as KitchenFiltersType,
} from "@/components/kitchen";
import { useGetKitchenOrders } from "@/hooks/useKitchen";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useBranchStore } from "@/store/branchStore";
import { Empty, Shad } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useKitchenSocket } from "@/hooks/useKitchenSocket";
import { useQueryClient } from "@tanstack/react-query";

const KITCHEN_ORDERS_PER_PAGE = 12;

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
});

function KitchenPage() {
  const { branchId } = useBranchStore();
  const queryClient = useQueryClient();
  const { page, setPage } = usePaginationState({
    initialPage: 1,
  });

  const [filters, setFilters] = useState<KitchenFiltersType>({
    orderStatus: "ALL",
  });

  const { data, isLoading, error } = useGetKitchenOrders({
    branchId: branchId!,
    page: String(page),
    limit: String(KITCHEN_ORDERS_PER_PAGE),
  });

  // Websocket integration
  const { lastUpdate } = useKitchenSocket(branchId!);

  useMemo(() => {
    if (lastUpdate) {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    }
  }, [lastUpdate, queryClient]);

  const orders = data?.data ?? [];
  const totalCount = data?.pagination.totalCount ?? 0;

  // Filter and sort orders: filter by status, oldest first, refunded orders at the bottom
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    // Apply order status filter
    if (filters.orderStatus !== "ALL") {
      filtered = filtered.filter((order) => order.status === filters.orderStatus);
    }

    // Sort: oldest first, refunded orders at the bottom
    return [...filtered].sort((a, b) => {
      const aIsRefunded = a.status === "FULLY_REFUNDED";
      const bIsRefunded = b.status === "FULLY_REFUNDED";

      // Refunded orders go to the bottom
      if (aIsRefunded && !bIsRefunded) return 1;
      if (!aIsRefunded && bIsRefunded) return -1;

      // Otherwise, sort by createdAt (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [orders, filters.orderStatus]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center w-full justify-between">
        <TitleBar
          title="Kitchen Orders"
          subtitle={`${totalCount} Active Orders`}
        />

        <div className="">
          <GridPagination
            page={page}
            totalPages={data?.pagination.totalPages || 0}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Filters */}
      <KitchenFilters filters={filters} onFiltersChange={setFilters} />

      {error && (
        <Shad.Alert variant="destructive">
          <Shad.AlertDescription>
            Failed to load kitchen orders. Please try again.
          </Shad.AlertDescription>
        </Shad.Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : filteredAndSortedOrders.length === 0 ? (
        <Empty
          title="No Active Orders"
          description="All orders have been completed or there are no new orders."
          icon={"ChefHat"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAndSortedOrders.map((order) => (
            <div key={order.id} className="break-inside-avoid mb-4">
              <KitchenCard order={order} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
