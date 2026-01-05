import type { Product } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { useModalStore } from "@/store/modalStore";
import { ProductForm } from "./ProductForm";
import { useDeleteProduct } from "@/hooks/useProduct";
import { useNavigate } from "@tanstack/react-router";

export const ProductActions = ({ product }: { product: Product }) => {
  const openModal = useModalStore((state) => state.openModal);
  const deleteMutation = useDeleteProduct();
  const navigate = useNavigate();

  const handleEdit = () => {
    openModal("Edit Product", <ProductForm product={product} />);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(product.id);
      } catch (error) {
        console.error("Failed to delete product:", error);
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
          onClick={() => navigate({ to: `/products/${product.id}` })}
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
