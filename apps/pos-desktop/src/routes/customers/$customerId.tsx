import { useCustomer, useCustomerOrders } from "@/hooks/useCustomer";
import { Avatar, Badge, Button, DataTable, Shad } from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import type { CustomerOrder } from "@/dto/customer.dto";
import { OrderStatus } from "@repo/types";

export const Route = createFileRoute("/customers/$customerId")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Customer Details",
  },
});

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getOrderStatusBadge = (status: string) => {
  switch (status) {
    case OrderStatus.COMPLETED:
      return <Badge className="bg-green-500">Completed</Badge>;
    case OrderStatus.PENDING:
      return <Badge variant="secondary">Pending</Badge>;
    case OrderStatus.DRAFT:
      return <Badge variant="outline">Draft</Badge>;
    case OrderStatus.ON_HOLD:
      return <Badge variant="secondary">On Hold</Badge>;
    case OrderStatus.SENT_TO_KITCHEN:
      return <Badge className="bg-blue-500">In Kitchen</Badge>;
    case OrderStatus.READY:
      return <Badge className="bg-yellow-500">Ready</Badge>;
    case OrderStatus.CANCELLED:
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getCustomerOrderColumns = (): ColumnDef<CustomerOrder>[] => [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.orderNumber || row.original.id.slice(0, 8)}
      </div>
    ),
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.branch?.name || "—"}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {new Date(row.original.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.type.replace("_", " ")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => getOrderStatusBadge(row.original.status),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <div className="font-medium">
        ${Number(row.original.total).toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "payments",
    header: "Payment",
    cell: ({ row }) => {
      const payments = row.original.payments || [];
      if (payments.length === 0) {
        return <span className="text-gray-400">—</span>;
      }
      return (
        <div className="space-y-0.5">
          {payments.map((p, idx) => {
            const amount = Number(p.amount);
            const currency = p.currencyCode || "USD";
            const rate = p.exchangeRate ? Number(p.exchangeRate) : null;
            return (
              <div
                key={idx}
                className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400"
              >
                <span className="font-medium">{p.method}</span>
                <span className="font-mono text-xs">
                  {amount.toLocaleString()} {currency}
                </span>
                {rate && rate !== 1 && (
                  <span className="text-xs text-muted-foreground">
                    (@{rate.toLocaleString()})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    },
  },
];

function RouteComponent() {
  const { customerId } = Route.useParams();
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: ordersResponse, isLoading: ordersLoading } =
    useCustomerOrders(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">Loading customer...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-gray-500 mb-4">Customer not found</p>
        <Link to="/customers">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Enhanced Header */}
      <div className="flex items-center gap-4">
        <Link to="/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-4 flex-1">
          <Avatar
            fallback={getInitials(customer.name)}
            className="h-16 w-16 text-xl bg-primary/10 text-primary border-2 border-background shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.name}
            </h1>
            <div className="flex items-center gap-3 text-muted-foreground mt-1 text-sm">
              {customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Total Orders
            </Shad.CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">{customer.orderCount}</div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Total Revenue
            </Shad.CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              ${customer.totalRevenue.toFixed(2)}
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Avg. Order Value
            </Shad.CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              ${customer.averageOrderValue.toFixed(2)}
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Last Order
            </Shad.CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              {customer.lastOrderAt
                ? new Date(customer.lastOrderAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </Shad.CardContent>
        </Shad.Card>
      </div>

      {/* Customer Information Card */}
      <Shad.Card>
        <Shad.CardHeader>
          <Shad.CardTitle>Customer Information</Shad.CardTitle>
        </Shad.CardHeader>
        <Shad.CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-base">{customer.phone || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-base">{customer.email || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-base">{customer.address || "—"}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Customer Since
                </p>
                <p className="text-base">
                  {new Date(customer.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Last Updated
                </p>
                <p className="text-base">
                  {new Date(customer.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </Shad.CardContent>
      </Shad.Card>

      {/* Orders Table */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Order History</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {ordersResponse?.pagination?.totalCount || 0} total orders
            </p>
          </div>
        </div>

        {(ordersResponse?.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
            <p className="text-gray-500">No orders yet</p>
          </div>
        ) : (
          <DataTable
            columns={getCustomerOrderColumns()}
            data={ordersResponse?.data ?? []}
            isLoading={ordersLoading}
          />
        )}
      </div>
    </div>
  );
}
