import { SubcategoryForm } from "@/components/category/SubcategoryForm";
import { DetailsSkeleton } from "@/components/common/DetailsSkeleton";
import TitleBar from "@/components/title-bar";
import { getSubcategoryColumns } from "@/constants/columns/subcategoryColumn";
import { useCategory } from "@/hooks/useCategory";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/categories/$categoryId")({
  component: RouteComponent,
  staticData: {
    breadcrumb: `Category Details`,
  },
});

function RouteComponent() {
  const { categoryId } = Route.useParams();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: category, isLoading } = useCategory(categoryId);
  const openModal = useModalStore((state) => state.openModal);

  const handleCreateSubcategory = () => {
    openModal(
      "Create Subcategory",
      <SubcategoryForm categoryId={categoryId} />,
    );
  };

  const subcategories =
    category?.subcategories?.filter((sub) => !sub.deletedAt) || [];

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-gray-500 mb-4">Category not found</p>
        <Link to="/categories">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TitleBar
        title={category.name}
        subtitle={category.description ?? ""}
        href={"/categories"}
      />

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Subcategories</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {subcategories.length}{" "}
              {subcategories.length === 1 ? "subcategory" : "subcategories"}
            </p>
          </div>
        </div>

        {subcategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
            <p className="text-gray-500 mb-4">No subcategories yet</p>
            <Button onClick={handleCreateSubcategory} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create First Subcategory
            </Button>
          </div>
        ) : (
          <DataTable
            columns={getSubcategoryColumns(categoryId)}
            data={subcategories}
            search={{
              term: searchQuery,
              onTermChange: setSearchQuery,
              keys: ["name", "description"],
            }}
            isLoading={isLoading}
            actions={
              <Button onClick={handleCreateSubcategory} iconName="Plus">
                Add Subcategory
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
