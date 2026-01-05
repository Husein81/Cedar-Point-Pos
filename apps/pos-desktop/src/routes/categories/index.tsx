import { CategoryForm } from "@/components/category/CategoryForm";
import Heading from "@/components/heading";
import { getCategoryColumns } from "@/config/categoryColumn";
import { useCategories } from "@/hooks/useCategory";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/categories/")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Categories",
  },
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: categories = [],
    isLoading,
    refetch,
  } = useCategories({
    search: searchQuery,
  });
  const openModal = useModalStore((state) => state.openModal);

  const handleCreateCategory = () => {
    openModal("Create Category", <CategoryForm />);
  };

  return (
    <div className="space-y-4">
      <Heading
        title="Categories"
        subtitle="Browse and manage all product categories"
      />
      <DataTable
        isLoading={isLoading}
        columns={getCategoryColumns()}
        data={categories}
        onRefetch={refetch}
        actions={
          <Button onClick={handleCreateCategory} iconName="Plus">
            Add Category
          </Button>
        }
        search={{
          term: searchQuery,
          onTermChange: setSearchQuery,
          keys: ["name", "description"],
        }}
      />
    </div>
  );
}
