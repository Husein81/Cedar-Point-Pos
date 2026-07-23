import { useMemo, useState } from "react";
import { Combobox, Icon, Shad } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { useCustomers } from "@/hooks/useCustomer";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { CustomerCard } from "./CustomerCard";
import { CustomerFormModal } from "./CustomerFormModal";

export const CustomerSelector = () => {
  const { openModal } = useModalStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useCustomers({
    page: 1,
    pageSize: 20,
    search: searchQuery || undefined,
  });

  const { getActiveOrder, setCustomer } = useOrderStore();
  const order = getActiveOrder();
  const customerId = order?.customerId ?? null;
  const customerName = order?.customerName ?? null;

  const options: ComboboxOption[] = useMemo(() => {
    if (!data) return [];
    return data.items
      .filter((customer) => customer.id !== customerId)
      .map((customer) => ({
        value: customer.id,
        label: customer.name,
        description: customer.phone || undefined,
        icon: (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
            <Icon name="User" className="w-4 h-4 text-muted-foreground" />
          </div>
        ),
      }));
  }, [data, customerId]);

  const handleSelectCustomer = (id: string | null) => {
    if (!id) return;
    const customer = data?.items.find((c) => c.id === id);
    if (customer) {
      setCustomer(customer.id, customer.name);
      setSearchQuery("");
    }
  };

  const handleOpenNewCustomer = () => {
    openModal(
      "New Customer",
      <CustomerFormModal
        onCustomerCreated={(customer) => setCustomer(customer.id, customer.name)}
      />,
    );
  };

  const hasCustomer = !!(customerId && customerName);

  return (
    <div className="space-y-2">
      {hasCustomer && (
        <CustomerCard
          customer={{ id: customerId, name: customerName, phone: null }}
          onRemove={() => setCustomer(null, null)}
        />
      )}

      <Combobox
        options={options}
        value={undefined}
        onValueChange={handleSelectCustomer}
        placeholder={hasCustomer ? "Change customer" : "Add customer (optional)"}
        searchPlaceholder="Search by name or phone..."
        emptyText={searchQuery ? "No customers found" : "No recent customers"}
        isLoading={isLoading}
        className="w-full h-8 rounded-sm text-muted-foreground"
        popoverWidth="w-104"
        open={open}
        onOpenChange={setOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        shouldFilter={false}
        triggerIcon={<Icon name="UserPlus" className="w-4 h-4" />}
        footer={
          <Shad.CommandGroup>
            <Shad.CommandItem
              onSelect={handleOpenNewCustomer}
              className="cursor-pointer text-primary hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Icon name="Plus" className="w-4 h-4" />
                <span className="font-medium">Add new customer</span>
              </div>
            </Shad.CommandItem>
          </Shad.CommandGroup>
        }
      />
    </div>
  );
};
