import { Icon, Shad } from "@repo/ui";
import { useModalStore } from "@/store/modalStore";
import { StockAdjustmentForm } from "./StockAdjustmentForm";
import type { InventoryWithProduct } from "@/dto/inventory.dto";

export const StockActions = ({ stock }: { stock: InventoryWithProduct }) => {
  const { openModal } = useModalStore();

  const handleStock = () => {
    openModal(
      "Stock Adjustment",
      <StockAdjustmentForm
        branchId={stock.branchId}
        productId={stock.productId}
        productName={stock.product.name}
        currentStock={String(stock.stock)}
      />
    );
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Icon name="Ellipsis" className="size-4" />
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="end">
        <Shad.DropdownMenuItem
          className="hover:text-accent"
          onClick={handleStock}
        >
          <Icon name="LocateFixed" className="h-4 w-4" />
          Stock Adjustment
        </Shad.DropdownMenuItem>
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
