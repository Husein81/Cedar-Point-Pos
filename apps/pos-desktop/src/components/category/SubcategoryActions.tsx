import { useDeleteSubcategory } from "@/hooks/useSubcategory";
import { useModalStore } from "@/store/modalStore";
import type { Subcategory } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { SubcategoryForm } from "./SubcategoryForm";

export const SubcategoryActions = ({
  subcategory,
  categoryId,
}: {
  subcategory: Subcategory;
  categoryId: string;
}) => {
  const openModal = useModalStore((state) => state.openModal);
  const deleteMutation = useDeleteSubcategory();

  const handleEdit = () => {
    openModal(
      "Edit Subcategory",
      <SubcategoryForm categoryId={categoryId} subcategory={subcategory} />
    );
  };

  const handleDelete = async () => {
    if (
      window.confirm(`Are you sure you want to delete "${subcategory.name}"?`)
    ) {
      try {
        await deleteMutation.mutateAsync(subcategory.id);
      } catch (error) {
        console.error("Failed to delete subcategory:", error);
      }
    }
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Icon name="Ellipsis" className="size-4" />
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="end">
        <Shad.DropdownMenuItem onClick={handleEdit}>
          <Icon name="SquarePen" className="h-4 w-4 hover:text-accent" />
          Edit
        </Shad.DropdownMenuItem>
        <Shad.DropdownMenuItem onClick={handleDelete} variant="destructive">
          <Icon name="Trash2" className="h-4 w-4" />
          Delete
        </Shad.DropdownMenuItem>
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
