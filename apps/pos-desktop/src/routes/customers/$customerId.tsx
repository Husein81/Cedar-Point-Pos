import { useCustomer, useCustomerOrders } from "@/hooks/useCustomer";
import {
  useCustomerLoyaltyAccount,
  useCustomerLoyaltyTransactions,
  useLoyaltyProgram,
} from "@/hooks/useLoyalty";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import { ManualAdjustmentForm } from "@/components/loyalty/ManualAdjustmentForm";
import { Avatar, Badge, Button, DataTable, Shad } from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
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
import type { LoyaltyTransaction } from "@/dto/loyalty.dto";
import { OrderStatus } from "@repo/types";
import { useState } from "react";

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
        <div className="text-gray-600 dark:text-gray-400">
          {payments.map((p) => p.method).join(", ")}
        </div>
      );
    },
  },
];

const getDirectionBadge = (direction: string) => {
  if (direction === "CREDIT") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Credit
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Debit
    </Badge>
  );
};

const getLoyaltyTransactionColumns = (): ColumnDef<LoyaltyTransaction>[] => [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {row.original.type.replace(/_/g, " ")}
      </div>
    ),
  },
  {
    accessorKey: "direction",
    header: "Direction",
    cell: ({ row }) => getDirectionBadge(row.original.direction),
  },
  {
    accessorKey: "points",
    header: "Points",
    cell: ({ row }) => (
      <div
        className={`font-mono font-medium ${
          row.original.direction === "CREDIT"
            ? "text-green-600"
            : "text-red-600"
        }`}
      >
        {row.original.direction === "CREDIT" ? "+" : "−"}
        {row.original.points.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "moneyAmount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = row.original.moneyAmount;
      return (
        <div className="text-sm font-mono">
          {amount != null ? `$${Number(amount).toFixed(2)}` : "—"}
        </div>
      );
    },
  },
  {
    accessorKey: "balanceAfter",
    header: "Balance",
    cell: ({ row }) => (
      <div className="text-sm font-mono font-medium">
        {row.original.balanceAfter.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground max-w-[200px] truncate">
        {row.original.reason || "—"}
      </div>
    ),
  },
  {
    id: "reference",
    header: "Reference",
    cell: ({ row }) => {
      if (row.original.order) {
        return (
          <div className="text-xs text-muted-foreground">
            Order #
            {row.original.order.orderNumber ||
              row.original.order.id.slice(0, 8)}
          </div>
        );
      }
      if (row.original.refund) {
        return (
          <div className="text-xs text-muted-foreground">
            Refund {row.original.refund.id.slice(0, 8)}
          </div>
        );
      }
      return <span className="text-gray-400">—</span>;
    },
  },
  {
    id: "actor",
    header: "Actor",
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">
        {row.original.actorUser?.name || "System"}
      </div>
    ),
  },
];

function RouteComponent() {
  const { customerId } = Route.useParams();
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: ordersResponse, isLoading: ordersLoading } =
    useCustomerOrders(customerId);

  // Loyalty data
  const { data: loyaltyProgram } = useLoyaltyProgram();
  const { data: loyaltyAccount } = useCustomerLoyaltyAccount(customerId);
  const [txPage, setTxPage] = useState(1);
  const { data: txResponse, isLoading: txLoading } =
    useCustomerLoyaltyTransactions(customerId, { page: txPage, limit: 10 });

  const { isHighLevelUser } = useAuthStore();
  const { openModal } = useModalStore();

  const showLoyalty = loyaltyProgram?.isEnabled;

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

      {/* ===== LOYALTY SECTION ===== */}
      {showLoyalty && (
        <>
          {/* Loyalty Summary Cards */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-semibold">Loyalty</h2>
              </div>
              {isHighLevelUser && loyaltyAccount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openModal(
                      "Adjust Points",
                      <ManualAdjustmentForm
                        customerId={customerId}
                        customerName={customer.name}
                        currentBalance={loyaltyAccount.pointsBalance}
                      />,
                    )
                  }
                >
                  <Award className="h-4 w-4 mr-1" />
                  Adjust Points
                </Button>
              )}
            </div>

            {loyaltyAccount ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <LoyaltyStat
                  label="Balance"
                  value={loyaltyAccount.pointsBalance}
                  highlight
                />
                <LoyaltyStat
                  label="Earned"
                  value={loyaltyAccount.lifetimeEarned}
                />
                <LoyaltyStat
                  label="Redeemed"
                  value={loyaltyAccount.lifetimeRedeemed}
                />
                <LoyaltyStat
                  label="Restored"
                  value={loyaltyAccount.lifetimeRestored}
                />
                <LoyaltyStat
                  label="Reversed"
                  value={loyaltyAccount.lifetimeReversed}
                />
                <LoyaltyStat
                  label="Adjusted"
                  value={loyaltyAccount.lifetimeAdjusted}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg">
                <Award className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No loyalty account yet — points will accrue on first order
                </p>
              </div>
            )}
          </div>

          {/* Loyalty Transactions */}
          {loyaltyAccount && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    Loyalty Transactions
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {txResponse?.pagination?.totalCount || 0} transactions
                  </p>
                </div>
              </div>

              {(txResponse?.data?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
                  <p className="text-gray-500">No loyalty transactions yet</p>
                </div>
              ) : (
                <DataTable
                  columns={getLoyaltyTransactionColumns()}
                  data={txResponse?.data ?? []}
                  isLoading={txLoading}
                  pagination={
                    txResponse?.pagination
                      ? {
                          rows: txResponse.pagination.totalCount,
                          page: txPage,
                          pageSize: 10,
                          totalPages: txResponse.pagination.totalPages,
                          onPageChange: setTxPage,
                          onPageSizeChange: () => {},
                        }
                      : undefined
                  }
                />
              )}
            </div>
          )}
        </>
      )}

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

// ── Helper: loyalty stat card ──

function LoyaltyStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg ${
        highlight
          ? "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"
          : "bg-muted/50"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-bold font-mono mt-0.5 ${
          highlight ? "text-purple-700 dark:text-purple-300" : ""
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
