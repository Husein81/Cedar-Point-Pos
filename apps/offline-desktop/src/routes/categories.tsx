import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, DataTable } from "@repo/ui";
import { CategoryForm } from "@/components/category/CategoryForm";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getCategoryColumns } from "@/components/category/categoryColumns";
import { useCategories, useDeleteCategory } from "@/hooks/useCategory";
import type { Category } from "@/shared/models";

export const Route = createFileRoute("/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories, isLoading, refetch } = useCategories();
  const deleteCategory = useDeleteCategory();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const columns = getCategoryColumns({
    onEdit: (category) => {
      setEditing(category);
      setIsFormOpen(true);
    },
    onDelete: (category) => setDeleting(category),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize your products into categories
          </p>
        </div>
        <Button
          iconName="Plus"
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
        >
          New Category
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={categories ?? []}
        isLoading={isLoading}
        onRefetch={refetch}
        search={{ keys: ["name"] }}
      />

      <CategoryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete category?"
        description={`"${deleting?.name}" will be removed. Products must be moved out of it first.`}
        isPending={deleteCategory.isPending}
        onConfirm={async () => {
          if (deleting) await deleteCategory.mutateAsync(deleting.id);
        }}
      />
    </div>
  );
}
