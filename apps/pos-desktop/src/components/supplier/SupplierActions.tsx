import { useDeleteSupplier } from "@/hooks/useSupplier";
import { useModalStore } from "@/store/modalStore";
import { Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { SupplierForm } from "./SupplierForm";
import type { SupplierDetails } from "@/dto/supplier.dto";

export const SupplierActions = ({
  supplier,
}: {
  supplier: SupplierDetails;
}) => {
  const openModal = useModalStore((state) => state.openModal);
  const deleteMutation = useDeleteSupplier();
  const navigate = useNavigate();

  const handleEdit = () => {
    openModal("Edit Supplier", <SupplierForm supplier={supplier} />);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${supplier.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(supplier.id);
      } catch (error) {
        console.error("Failed to delete supplier:", error);
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
          onClick={() => navigate({ to: `/suppliers/${supplier.id}` })}
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
