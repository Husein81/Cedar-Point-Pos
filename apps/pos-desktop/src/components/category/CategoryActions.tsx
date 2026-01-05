import { useDeleteCategory } from "@/hooks/useCategory";
import { useModalStore } from "@/store/modalStore";
import type { Category } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { CategoryForm } from "./CategoryForm";

export const CategoryActions = ({ category }: { category: Category }) => {
  const openModal = useModalStore((state) => state.openModal);
  const deleteMutation = useDeleteCategory();
  const navigate = useNavigate();

  const handleEdit = () => {
    openModal("Edit Category", <CategoryForm category={category} />);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(category.id);
      } catch (error) {
        console.error("Failed to delete category:", error);
      }
    }
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Icon name="Ellipsis" className="size-4" />
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="end">
        <Shad.DropdownMenuItem
          className="hover:text-accent"
          onClick={() => navigate({ to: `/categories/${category.id}` })}
        >
          <Icon name="Eye" className="h-4 w-4 hover:text-accent" />
          View Details
        </Shad.DropdownMenuItem>
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
