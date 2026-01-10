import { useDeleteCustomer } from "@/hooks/useCustomer";
import { useModalStore } from "@/store/modalStore";
import { Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { CustomerForm } from "./CustomerForm";
import type { CustomerDetails } from "@/dto/customer.dto";

export const CustomerActions = ({
  customer,
}: {
  customer: CustomerDetails;
}) => {
  const openModal = useModalStore((state) => state.openModal);
  const deleteMutation = useDeleteCustomer();
  const navigate = useNavigate();

  const handleEdit = () => {
    openModal("Edit Customer", <CustomerForm customer={customer} />);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${customer.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(customer.id);
      } catch (error) {
        console.error("Failed to delete customer:", error);
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
          onClick={() => navigate({ to: `/customers/${customer.id}` })}
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
