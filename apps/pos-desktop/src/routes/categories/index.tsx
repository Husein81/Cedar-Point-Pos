import { Button, DataTable, Loading } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { categoryColumns } from "@/config/index";
import { useCategories } from "@/hooks/categories";

export const Route = createFileRoute("/categories/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useCategories({
    page: page.toString(),
    limit: pageSize.toString(),
  });

  if (isLoading) return <Loading />;

  return (
    <section className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <Button>Add Category</Button>
      </div>

      <DataTable
        columns={categoryColumns}
        data={data?.data ?? []}
        pagination={{
          page,
          pageSize,
          totalPages: data?.pagination?.totalPages ?? 1,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />
    </section>
  );
}
