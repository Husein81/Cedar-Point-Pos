import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, DataTable } from "@repo/ui";
import { ProductForm } from "@/components/products/ProductForm";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getProductColumns } from "@/components/products/productColumns";
import { useDeleteProduct, useProducts } from "@/hooks/useProduct";
import { useSettings } from "@/hooks/useSettings";
import type { Product } from "@/shared/models";
import { usePagination } from "@/hooks/usePagination";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const {
    page,
    pageSize,
    setPage,
    onPageSizeChange,
    searchQuery,
    setSearchQuery,
  } = usePagination({});

  const { data, isLoading, refetch } = useProducts({
    page,
    pageSize,
    search: searchQuery || undefined,
    activeOnly: false,
    lowStockOnly: false,
  });
  const { data: settings } = useSettings();
  const deleteProduct = useDeleteProduct();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const currencySymbol = settings?.currencySymbol ?? "$";

  const columns = getProductColumns({
    currencySymbol,
    onEdit: (product) => {
      setEditing(product);
      setIsFormOpen(true);
    },
    onDelete: (product) => setDeleting(product),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your catalog, prices and stock
          </p>
        </div>
        <Button
          iconName="Plus"
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
        >
          New Product
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRefetch={refetch}
        search={{
          term: searchQuery,
          onTermChange: (term) => {
            setSearchQuery(term);
            setPage(1);
          },
          keys: ["name", "sku", "barcode"],
        }}
        pagination={{
          rows: data?.total ?? 0,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
          onPageChange: setPage,
          onPageSizeChange,
        }}
      />

      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete product?"
        description={`"${deleting?.name}" will be removed from the catalog. Past sales keep their records.`}
        isPending={deleteProduct.isPending}
        onConfirm={async () => {
          if (deleting) await deleteProduct.mutateAsync(deleting.id);
        }}
      />
    </div>
  );
}
