import { SkeletonCard } from "@/components/common/SkeletonCard";
import Heading from "@/components/heading";
import { KitchenCard } from "@/components/kitchen";
import { useGetKitchenOrders } from "@/hooks/useKitchen";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { Empty } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
});

function KitchenPage() {
  const { user } = useAuthStore();
  const { branchId } = useBranchStore();

  //   Only allow KITCHEN role users
  //   if (user?.role !== "KITCHEN") {
  //     return <Navigate to="/dashboard" />;
  //   }

  const { data: orders = [], isLoading } = useGetKitchenOrders(branchId!);

  return (
    <div className="p-6 space-y-6">
      <Heading
        title="Kitchen Orders"
        subtitle={`${orders.length} Active Orders`}
      />

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {orders.map((order) => (
            <KitchenCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
