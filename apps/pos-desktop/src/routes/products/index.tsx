import TitleBar from "@/components/title-bar";
import { BulkImportModal } from "@/components/common";
import { ProductForm } from "@/components/products/ProductForm";
import { productColumns } from "@/components/products/productColumn";
import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_SAMPLE,
  parseProductRow,
} from "@/components/products/bulkImportConfig";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useBulkCreateProducts, useProductsPaginated } from "@/hooks/useProduct";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Upload } from "lucide-react";

export const Route = createFileRoute("/products/")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    page,
    pageSize,
    searchQuery,
    setSearchQuery,
    onPageSizeChange,
    setPage,
  } = usePaginationState({});

  const { data, isLoading, refetch } = useProductsPaginated({
    page: String(page),
    limit: String(pageSize),
    search: searchQuery,
  });

  const products = data?.data ?? [];

  const { openModal } = useModalStore();
  const bulkCreateProducts = useBulkCreateProducts();
  // Product catalog management (create/import) is Manager/Admin only.
  const canManageProducts = useAuthStore((s) => s.isHighLevelUser);

  const handleCreateProduct = () => {
    openModal("Create Product", <ProductForm />);
  };

  const handleBulkImport = () => {
    openModal(
      "Bulk Import Products",
      <BulkImportModal
        columns={PRODUCT_IMPORT_COLUMNS}
        parseRow={parseProductRow}
        sampleRow={PRODUCT_IMPORT_SAMPLE}
        onSubmit={(rows) => bulkCreateProducts.mutateAsync(rows)}
      />,
    );
  };

  const totalPages = Math.ceil(
    Number(data?.pagination?.totalCount ?? 1) / pageSize,
  );

  return (
    <div className="space-y-4 pt-4">
      <TitleBar title={"Products"} subtitle={"Manage your products"} />

      <DataTable
        columns={productColumns}
        data={products}
        isLoading={isLoading}
        onRefetch={refetch}
        search={{
          term: searchQuery,
          onTermChange: setSearchQuery,
          keys: ["name", "sku", "barcode"],
        }}
        actions={
          canManageProducts ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBulkImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={handleCreateProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          ) : undefined
        }
        pagination={{
          rows: data?.pagination.totalCount ?? 0,
          page,
          pageSize,
          totalPages,
          onPageChange: setPage,
          onPageSizeChange,
        }}
      />
    </div>
  );
}
