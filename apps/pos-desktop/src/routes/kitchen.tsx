import { SkeletonCard } from "@/components/common/SkeletonCard";
import GridPagination from "@/components/grid-pagination";
import Heading from "@/components/heading";
import { KitchenCard } from "@/components/kitchen";
import { useGetKitchenOrders } from "@/hooks/useKitchen";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useBranchStore } from "@/store/branchStore";
import { Empty } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
});

function KitchenPage() {
  const { branchId } = useBranchStore();
  const { page, setPage } = usePaginationState({
    initialPage: 1,
  });

  const { data, isLoading } = useGetKitchenOrders({
    branchId: branchId!,
    page: String(page),
    limit: "12",
  });

  const orders = data?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center w-full justify-between">
        <Heading
          title="Kitchen Orders"
          subtitle={`${orders.length} Active Orders`}
        />

        <div className="">
          <GridPagination
            page={page}
            totalPages={data?.pagination.totalPages || 0}
            onPageChange={setPage}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Empty
          title="No Active Orders"
          description="All orders have been completed or there are no new orders."
          icon={"ChefHat"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <KitchenCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
