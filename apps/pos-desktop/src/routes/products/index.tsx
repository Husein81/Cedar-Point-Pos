import TitleBar from "@/components/title-bar";
import { ProductForm } from "@/components/products/ProductForm";
import { productColumns } from "@/config/productColumn";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useProductsPaginated } from "@/hooks/useProduct";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

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

  const handleCreateProduct = () => {
    openModal("Create Product", <ProductForm />);
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
          <Button onClick={handleCreateProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
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
