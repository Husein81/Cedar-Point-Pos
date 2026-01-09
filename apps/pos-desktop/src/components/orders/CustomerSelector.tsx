import { useState, useCallback, useMemo } from "react";
import { Combobox, Icon, Shad } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { useSearchCustomers } from "@/hooks/useCustomer";
import { useDebounce } from "@/hooks/useDebounce";
import { useOrderStore } from "@/store/orderStore";
import { CustomerCard } from "./CustomerCard";
import { CreateCustomerForm } from "./CreateCustomerForm";
import type { CustomerSummary } from "@/dto/customer.dto";

type Props = {
  className?: string;
};

/**
 * Customer selector component for POS cart
 * - Shows search popover when no customer selected
 * - Shows CustomerCard when customer is selected
 * - Supports creating new customers via dialog
 */
export const CustomerSelector = ({ className }: Props) => {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: customers, isLoading } = useSearchCustomers(
    debouncedQuery,
    open
  );

  const { getActiveOrder, setCustomer } = useOrderStore();
  const order = getActiveOrder();
  const selectedCustomerId = order?.customerId;
  const selectedCustomerName = order?.customerName;

  // Convert customers to combobox options
  const options: ComboboxOption[] = useMemo(() => {
    if (!customers) return [];
    return customers.map((customer) => ({
      value: customer.id,
      label: customer.name,
      description: customer.phone || undefined,
      icon: (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
          <Icon name="User" className="w-4 h-4 text-muted-foreground" />
        </div>
      ),
    }));
  }, [customers]);

  const handleSelectCustomer = useCallback(
    (customerId: string | null) => {
      if (!customerId) {
        setCustomer(null, null);
        return;
      }
      const customer = customers?.find((c) => c.id === customerId);
      if (customer) {
        setCustomer(customer.id, customer.name);
        setSearchQuery("");
      }
    },
    [customers, setCustomer]
  );

  const handleRemoveCustomer = useCallback(() => {
    setCustomer(null, null);
  }, [setCustomer]);

  const handleCustomerCreated = useCallback(
    (customer: CustomerSummary) => {
      setCustomer(customer.id, customer.name);
    },
    [setCustomer]
  );

  const handleOpenNewCustomerDialog = () => {
    setOpen(false);
    setDialogOpen(true);
  };

  // If customer is selected, show the card
  if (selectedCustomerId && selectedCustomerName) {
    return (
      <div className={className}>
        <CustomerCard
          customer={{
            id: selectedCustomerId,
            name: selectedCustomerName,
            phone: null,
          }}
          onRemove={handleRemoveCustomer}
        />
      </div>
    );
  }

  // Otherwise, show the combobox selector
  return (
    <div className={className}>
      <Combobox
        options={options}
        value={selectedCustomerId}
        onValueChange={handleSelectCustomer}
        placeholder="Add customer (optional)"
        searchPlaceholder="Search by name or phone..."
        emptyText={searchQuery ? "No customers found" : "No recent customers"}
        isLoading={isLoading}
        className="w-full h-10 text-muted-foreground"
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
              onSelect={handleOpenNewCustomerDialog}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 text-primary">
                <Icon name="Plus" className="w-4 h-4" />
                <span className="font-medium">Add new customer</span>
              </div>
            </Shad.CommandItem>
          </Shad.CommandGroup>
        }
      />

      {/* Create Customer Dialog */}
      <CreateCustomerForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  );
};
