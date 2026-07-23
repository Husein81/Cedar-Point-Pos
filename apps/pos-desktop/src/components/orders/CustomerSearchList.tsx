import { useState, useCallback, useEffect } from "react";
import { useSearchCustomers } from "@/hooks/useCustomer";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { CustomerForm } from "./CustomerForm";
import type { CustomerSummary } from "@/dto/customer.dto";
import { Button, Icon, Input, Shad } from "@repo/ui";
import { OrderType } from "@repo/types";

export const CustomerSearchList = () => {
  const { openModal, closeModal } = useModalStore();
  const { setCustomer, getActiveOrder } = useOrderStore();
  const order = getActiveOrder();
  const requireAddress = order?.type === OrderType.DELIVERY;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: customers, isLoading } = useSearchCustomers(
    debouncedQuery,
    true,
  );

  const handleSelectCustomer = useCallback(
    (customer: CustomerSummary) => {
      setCustomer(customer.id, customer.name);
      closeModal();
    },
    [setCustomer, closeModal],
  );

  const handleCustomerCreated = useCallback(
    (customer: CustomerSummary) => {
      setCustomer(customer.id, customer.name);
    },
    [setCustomer],
  );

  const handleOpenNewCustomer = () => {
    openModal(
      "New Customer",
      <CustomerForm
        onCustomerCreated={handleCustomerCreated}
        requireAddress={requireAddress}
      />,
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Icon
          name="Search"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        />
        <Input
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      <Shad.ScrollArea className="max-h-64">
        <div className="flex flex-col gap-1">
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Icon name="LoaderCircle" className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </div>
          )}

          {!isLoading && (!customers || customers.length === 0) && (
            <div className="flex flex-col items-center justify-center py-6 gap-1">
              <Icon
                name="Users"
                className="h-5 w-5 text-muted-foreground mb-1"
              />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No customers found" : "No recent customers"}
              </p>
            </div>
          )}

          {!isLoading &&
            customers?.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-accent/50 transition-colors text-left w-full"
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                  <Icon name="User" className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {customer.name}
                  </p>
                  {customer.phone && (
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.phone}
                    </p>
                  )}
                </div>
                <Icon
                  name="ChevronRight"
                  className="h-4 w-4 text-muted-foreground shrink-0"
                />
              </button>
            ))}
        </div>
        <Shad.ScrollBar />
      </Shad.ScrollArea>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleOpenNewCustomer}
      >
        <Icon name="UserPlus" className="w-4 h-4" />
        Add New Customer
      </Button>
    </div>
  );
};
