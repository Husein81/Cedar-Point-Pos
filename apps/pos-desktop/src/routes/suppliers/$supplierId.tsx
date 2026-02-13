import { useSupplier, useSupplierPurchaseOrders } from "@/hooks/useSupplier";
import { Avatar, Badge, Button, DataTable, Shad } from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  StickyNote,
  Tag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import type { SupplierPurchaseOrder } from "@/dto/supplier.dto";
import { PurchaseOrderStatus } from "@repo/types";

export const Route = createFileRoute("/suppliers/$supplierId")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Supplier Details",
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

const getPurchaseOrderStatusBadge = (status: string) => {
  switch (status) {
    case PurchaseOrderStatus.RECEIVED:
      return <Badge className="bg-green-500">Received</Badge>;
    case PurchaseOrderStatus.PENDING:
      return <Badge variant="secondary">Pending</Badge>;
    case PurchaseOrderStatus.ORDERED:
      return <Badge className="bg-blue-500">Ordered</Badge>;
    case PurchaseOrderStatus.CANCELLED:
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getPurchaseOrderColumns = (): ColumnDef<SupplierPurchaseOrder>[] => [
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
    accessorKey: "orderedAt",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {new Date(row.original.orderedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => getPurchaseOrderStatusBadge(row.original.status),
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => (
      <div className="font-medium">
        ${Number(row.original.totalAmount).toFixed(2)}
      </div>
    ),
  },
  {
    id: "items",
    header: "Items",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.items?.length || 0}
      </div>
    ),
  },
];

function RouteComponent() {
  const { supplierId } = Route.useParams();
  const { data: supplier, isLoading } = useSupplier(supplierId);
  const { data: purchaseOrdersResponse, isLoading: purchaseOrdersLoading } =
    useSupplierPurchaseOrders(supplierId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">Loading supplier...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-gray-500 mb-4">Supplier not found</p>
        <Link to="/suppliers">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/suppliers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-4 flex-1">
          <Avatar
            fallback={getInitials(supplier.name)}
            className="h-16 w-16 text-xl bg-primary/10 text-primary border-2 border-background shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {supplier.name}
            </h1>
            <div className="flex items-center gap-3 text-muted-foreground mt-1 text-sm">
              {supplier.companyName && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {supplier.companyName}
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {supplier.email}
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
              Total Purchase Orders
            </Shad.CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">{supplier.totalOrders}</div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Total Spent
            </Shad.CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              ${supplier.totalPurchaseAmount.toFixed(2)}
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Avg. Purchase Value
            </Shad.CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              ${supplier.averagePurchaseValue.toFixed(2)}
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Last Purchase
            </Shad.CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              {supplier.lastPurchaseDate
                ? new Date(supplier.lastPurchaseDate).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )
                : "—"}
            </div>
          </Shad.CardContent>
        </Shad.Card>
      </div>

      {/* Supplier Information Card */}
      <Shad.Card>
        <Shad.CardHeader>
          <Shad.CardTitle>Supplier Information</Shad.CardTitle>
        </Shad.CardHeader>
        <Shad.CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-base">{supplier.phone || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-base">{supplier.email || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-base">{supplier.address || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Company Name
                </p>
                <p className="text-base">{supplier.companyName || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="text-base">{supplier.category || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Wallet className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Current Balance
                </p>
                <p className="text-base">
                  ${Number(supplier.currentBalance).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {supplier.notes && (
            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <StickyNote className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-base">{supplier.notes}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Supplier Since
                </p>
                <p className="text-base">
                  {new Date(supplier.createdAt).toLocaleDateString("en-US", {
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
                  {new Date(supplier.updatedAt).toLocaleDateString("en-US", {
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

      {/* Purchase Order History Table */}
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

        {(purchaseOrdersResponse?.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
            <p className="text-gray-500">No purchase orders yet</p>
          </div>
        ) : (
          <DataTable
            columns={getPurchaseOrderColumns()}
            data={purchaseOrdersResponse?.data ?? []}
            isLoading={purchaseOrdersLoading}
          />
        )}
      </div>
    </div>
  );
}
