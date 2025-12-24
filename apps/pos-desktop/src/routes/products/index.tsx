import { productColumns } from "@/config/productColumn";
import { DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/products/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <div>
      <DataTable
        columns={productColumns}
        data={[]}
        pagination={{
          page,
          pageSize,
          totalPages: 5,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />
    </div>
  );
}
