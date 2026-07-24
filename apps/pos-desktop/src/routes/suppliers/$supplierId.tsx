import { DetailsSkeleton } from "@/components/common/DetailsSkeleton";
import { SupplierInfo } from "@/components/supplier/SupplierInfo";
import TitleBar from "@/components/title-bar";
import { getPurchaseOrderColumns } from "@/components/supplier/supplierColumn";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { useSupplier, useSupplierPurchaseOrders } from "@/hooks/useSupplier";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { Button, DataTable, Icon, Shad } from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/suppliers/$supplierId")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Supplier Details",
  },
});

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
}

function RouteComponent() {
  const { supplierId } = Route.useParams();
  const { data: supplier, isLoading } = useSupplier(supplierId);
  const { data: purchaseOrdersResponse, isLoading: purchaseOrdersLoading } =
    useSupplierPurchaseOrders(supplierId);
  const { format: formatMoney } = useBaseCurrency();

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-gray-500 mb-4">Supplier not found</p>
        <Link to="/suppliers">
          <Button variant="outline">
            <Icon name="ArrowLeft" className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </Link>
      </div>
    );
  }

  const stats: StatCard[] = [
    {
      title: "Total Purchase Orders",
      value: supplier.totalOrders,
      icon: "ShoppingCart",
    },
    {
      title: "Total Spent",
      value: formatMoney(supplier.totalPurchaseAmount),
      icon: "DollarSign",
    },
    {
      title: "Avg. Purchase Value",
      value: formatMoney(supplier.averagePurchaseValue),
      icon: "TrendingUp",
    },
    {
      title: "Last Purchase",
      value: supplier.lastPurchaseDate
        ? new Date(supplier.lastPurchaseDate).toLocaleDateString(DEFAULT_LOCALE, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      icon: "Calendar",
    },
  ];

  return (
    <div className="space-y-6">
      <TitleBar title={supplier.name} href="/suppliers" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Shad.Card key={stat.title}>
            <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Shad.CardTitle className="text-sm font-medium">
                {stat.title}
              </Shad.CardTitle>
              <Icon
                name={stat.icon}
                className="h-4 w-4 text-muted-foreground"
              />
            </Shad.CardHeader>
            <Shad.CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </Shad.CardContent>
          </Shad.Card>
        ))}
      </div>

      <SupplierInfo supplier={supplier} />

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Purchase Order History</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {purchaseOrdersResponse?.pagination?.totalCount || 0} total
              purchase orders
            </p>
          </div>
        </div>

        <DataTable
          columns={getPurchaseOrderColumns(formatMoney)}
          data={purchaseOrdersResponse?.data ?? []}
          isLoading={purchaseOrdersLoading}
        />
      </div>
    </div>
  );
}
