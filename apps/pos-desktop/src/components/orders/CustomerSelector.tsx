import { useState, useCallback, useMemo } from "react";
import { Combobox, Icon, Shad, toast } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { useSearchCustomers } from "@/hooks/useCustomer";
import { useSetOrderCustomers } from "@/hooks/useOrder";
import { useOrderStore } from "@/store/orderStore";
import { CustomerCard } from "./CustomerCard";
import type { CustomerSummary } from "@/dto/customer.dto";
import { useModalStore } from "@/store/modalStore";
import { CustomerForm } from "./CustomerForm";
import { extractErrorMessage } from "@/utils/error";
import { OrderType } from "@repo/types";
import _ from "lodash";

/** A persisted (server-side) order has a UUID id; drafts are prefixed "order-". */
const isPersistedOrder = (orderId?: string): boolean =>
  !!orderId && !orderId.startsWith("order-");

type Props = {
  className?: string;
};

export const CustomerSelector = ({ className }: Props) => {
  const { openModal } = useModalStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const debounce = useMemo(() => _.debounce((query: string) => query, 200), []);

  const debouncedQuery = debounce(searchQuery);

  const { data: customers, isLoading } = useSearchCustomers(
    debouncedQuery ?? "",
    open,
  );

  const {
    getActiveOrder,
    setCustomer,
    addAdditionalCustomer,
    removeAdditionalCustomer,
  } = useOrderStore();
  const setOrderCustomers = useSetOrderCustomers();
  const order = getActiveOrder();
  const primaryCustomerId = order?.customerId;
  const primaryCustomerName = order?.customerName;
  const additionalCustomers = order?.additionalCustomers ?? [];

  // Push the full customer list of an already-created (server-side) order.
  // Draft orders persist their customers on the initial create, so this is a
  // no-op for them. Reads fresh store state after synchronous store updates.
  const syncOrderCustomers = useCallback(() => {
    const active = useOrderStore.getState().getActiveOrder();
    if (!active || !isPersistedOrder(active.id)) return;
    setOrderCustomers.mutate(
      {
        id: active.id,
        customerId: active.customerId,
        additionalCustomerIds: active.additionalCustomers.map((c) => c.id),
      },
      {
        onError: (error) =>
          toast.error(extractErrorMessage(error, "Failed to update customers")),
      },
    );
  }, [setOrderCustomers]);

  // Hide already-selected customers (primary + guests) from the add list.
  const selectedIds = useMemo(() => {
    const ids = new Set(additionalCustomers.map((c) => c.id));
    if (primaryCustomerId) ids.add(primaryCustomerId);
    return ids;
  }, [additionalCustomers, primaryCustomerId]);

  const options: ComboboxOption[] = useMemo(() => {
    if (!customers) return [];
    return customers
      .filter((customer) => !selectedIds.has(customer.id))
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
  }, [customers, selectedIds]);

  // First customer becomes the primary (earns loyalty); the rest are guests.
  const addCustomer = useCallback(
    (customer: { id: string; name: string }) => {
      const active = useOrderStore.getState().getActiveOrder();
      if (active?.customerId) {
        addAdditionalCustomer({ id: customer.id, name: customer.name });
      } else {
        setCustomer(customer.id, customer.name);
      }
      syncOrderCustomers();
    },
    [addAdditionalCustomer, setCustomer, syncOrderCustomers],
  );

  const handleSelectCustomer = useCallback(
    (customerId: string | null) => {
      if (!customerId) return;
      const customer = customers?.find((c) => c.id === customerId);
      if (customer) {
        addCustomer({ id: customer.id, name: customer.name });
        setSearchQuery("");
      }
    },
    [customers, addCustomer],
  );

  // Removing the primary promotes the first guest (if any) so loyalty keeps a
  // holder; setCustomer de-dupes the promoted id out of the guest list.
  const handleRemovePrimary = useCallback(() => {
    const active = useOrderStore.getState().getActiveOrder();
    const next = active?.additionalCustomers[0];
    if (next) {
      setCustomer(next.id, next.name);
    } else {
      setCustomer(null, null);
    }
    syncOrderCustomers();
  }, [setCustomer, syncOrderCustomers]);

  const handleRemoveAdditional = useCallback(
    (customerId: string) => {
      removeAdditionalCustomer(customerId);
      syncOrderCustomers();
    },
    [removeAdditionalCustomer, syncOrderCustomers],
  );

  const handleCustomerCreated = useCallback(
    (customer: CustomerSummary) => {
      addCustomer({ id: customer.id, name: customer.name });
    },
    [addCustomer],
  );

  const handleOpenNewCustomer = () => {
    const isDelivery = order?.type === OrderType.DELIVERY;
    openModal(
      "Customer Form",
      <CustomerForm
        onCustomerCreated={handleCustomerCreated}
        requireAddress={isDelivery}
      />,
    );
  };

  const hasPrimary = !!(primaryCustomerId && primaryCustomerName);

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {hasPrimary && (
        <CustomerCard
          customer={{
            id: primaryCustomerId,
            name: primaryCustomerName,
            phone: null,
          }}
          badgeLabel="Primary"
          onRemove={handleRemovePrimary}
        />
      )}

      {additionalCustomers.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={{ id: customer.id, name: customer.name, phone: null }}
          badgeLabel="Guest"
          onRemove={() => handleRemoveAdditional(customer.id)}
        />
      ))}

      <Combobox
        options={options}
        value={undefined}
        onValueChange={handleSelectCustomer}
        placeholder={hasPrimary ? "Add another customer" : "Add customer (optional)"}
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
