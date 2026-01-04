import { CategoryForm } from "@/components/category/CategoryForm";
import Heading from "@/components/heading";
import { getCategoryColumns } from "@/config/categoryColumn";
import { useCategories } from "@/hooks/useCategory";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable, Icon } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/categories/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories = [], isLoading } = useCategories({
    search: searchQuery,
  });
  console.log("Categories data:", categories);
  const openModal = useModalStore((state) => state.openModal);

  const handleCreateCategory = () => {
    openModal("Create Category", <CategoryForm />);
  };

  // Calculate pagination
  return (
    <div className="container pt-4 mx-auto space-y-4">
      <Heading
        title="Category List"
        subtitle="Browse and manage all product categories"
        actions={
          <Button onClick={handleCreateCategory}>
            <Icon name="Plus" className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        }
      />
      <DataTable
        isLoading={isLoading}
        columns={getCategoryColumns()}
        data={categories}
        search={{
          term: searchQuery,
          onTermChange: setSearchQuery,
          keys: ["name", "description"],
        }}
      />
    </div>
  );
}
