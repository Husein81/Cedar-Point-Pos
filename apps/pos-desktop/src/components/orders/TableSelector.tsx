import { useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { Button, Icon } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { TableSelectorModal } from "./TableSelectorModal";
import type { TableWithFloor } from "@/dto/tables.dto";
import { ordersApi } from "@/apis/ordersApi";



export function TableSelector() {
    const { openModal } = useModalStore();
    const { getActiveOrder, getOrderByTableId, setTable, loadExistingOrder } = useOrderStore();
    const order = getActiveOrder();


  const searchParams = useSearch({ from: "/orders/" });

    
    // Helper to select a table and load its active order if one exists
    const selectTableWithActiveOrderCheck = async (tableId: string, tableName: string) => {
        // Set the table first (instant UI feedback)
        setTable(tableId, tableName);
        
        // FIRST: Check backend for existing orders (including DRAFT)
        try {
            const backendOrder = await ordersApi.getActiveOrderByTableId(tableId);
            
            if (backendOrder) {
                console.log("Found backend order:", backendOrder.id, backendOrder.status);
                loadExistingOrder(backendOrder as any);
                return;
            }
        } catch (error) {
            console.error("Failed to fetch active order from backend:", error);
        }
        
        // SECOND: Fall back to local tabs (for unsaved orders in same session)
        const localOrder = getOrderByTableId(tableId);
        if (localOrder && localOrder.items.length > 0) {
            console.log("Found local order in another tab");
            loadExistingOrder({
                ...localOrder,
                items: localOrder.items.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    product: { id: item.productId, name: item.name, imageUrl: item.imageUrl },
                    notes: item.notes,
                    discount: item.discount,
                    modifiers: item.modifiers?.map(m => ({
                        modifierId: m.modifierId,
                        price: m.price,
                        modifier: { id: m.modifierId, name: m.name }
                    }))
                })),
                table: { name: localOrder.tableName },
                customer: localOrder.customerName ? { name: localOrder.customerName } : null
            } as any);
        }
    };

  
  useEffect(() => {
      const tableId = searchParams?.tableId;
      const tableName = searchParams?.tableName;

      if (tableId && tableName) {
          selectTableWithActiveOrderCheck(tableId, tableName);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleTableSelect = (table: TableWithFloor) => {
    
    if (!table.id) {
      setTable(null, null);
      return;
    }

    const displayName = table.floor
      ? `${table.floor.name} - ${table.name}`
      : table.name;
    
    
    selectTableWithActiveOrderCheck(table.id, displayName);
  };

  const handleOpenModal = () => {
    openModal(
      "Table Selection",
      <TableSelectorModal
        onTableSelect={handleTableSelect}
        currentTableId={order?.tableId}
      />,
    );
  };

  return (
    <Button
      variant={order?.tableId ? "default" : "outline"}
      size="sm"
      onClick={handleOpenModal}
      className="h-7 text-xs gap-1.5"
    >
      <Icon name="Utensils" className="h-3.5 w-3.5" />
      <span className="max-w-24 truncate">
        {order?.tableName || "Select Table"}
      </span>
      <Icon name="ChevronRight" className="h-3 w-3 ml-0.5" />
    </Button>
  );
}
