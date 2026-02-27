import { useEffect, useMemo, useState } from "react";
import { Combobox, Icon, Shad } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { SupplierForm } from "@/components/supplier/SupplierForm";
import type { SupplierSummary } from "@/dto/supplier.dto";
import { useSearchSuppliers } from "@/hooks/useSupplier";
import { useModalStore } from "@/store/modalStore";

type Props = {
  value: string | null;
  onValueChange: (supplierId: string) => void;
  className?: string;
};

export const SupplierSelector = ({ value, onValueChange, className }: Props) => {
  const { openModal } = useModalStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSummary | null>(
    null,
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const { data: suppliers, isLoading } = useSearchSuppliers(debouncedQuery, open);

  useEffect(() => {
    if (!value || !suppliers?.length) return;
    const match = suppliers.find((supplier) => supplier.id === value);
    if (match) {
      setSelectedSupplier(match);
    }
  }, [suppliers, value]);

  useEffect(() => {
    if (!value) {
      setSelectedSupplier(null);
    }
  }, [value]);

  const options: ComboboxOption[] = useMemo(
    () =>
      (suppliers ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
        description: supplier.companyName ?? supplier.phone ?? undefined,
        icon: (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon name="Truck" className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        ),
      })),
    [suppliers],
  );

  const handleSelectSupplier = (supplierId: string | null) => {
    if (!supplierId) return;

    const supplier = suppliers?.find((entry) => entry.id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
    }

    onValueChange(supplierId);
    setSearchQuery("");
  };

  const handleSupplierCreated = (supplier: SupplierSummary) => {
    setSelectedSupplier(supplier);
    onValueChange(supplier.id);
    setSearchQuery("");
  };

  const handleOpenCreateSupplier = () => {
    openModal(
      "Add Supplier",
      <SupplierForm onSupplierCreated={handleSupplierCreated} />,
    );
  };

  if (value) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <Icon name="Truck" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {selectedSupplier?.name ?? "Selected Supplier"}
            </p>
            {(selectedSupplier?.companyName ?? selectedSupplier?.phone) && (
              <p className="truncate text-xs text-muted-foreground">
                {selectedSupplier?.companyName ?? selectedSupplier?.phone}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onValueChange("")}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear supplier"
          >
            <Icon name="X" className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Combobox
        options={options}
        value={value}
        onValueChange={handleSelectSupplier}
        placeholder="Search and select supplier..."
        searchPlaceholder="Search by name, company, or phone..."
        emptyText={searchQuery ? "No suppliers found" : "No recent suppliers"}
        isLoading={isLoading}
        className="w-full"
        open={open}
        onOpenChange={setOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        shouldFilter={false}
        triggerIcon={<Icon name="Truck" className="h-4 w-4" />}
        footer={
          <Shad.CommandGroup>
            <Shad.CommandItem
              onSelect={handleOpenCreateSupplier}
              className="cursor-pointer text-primary hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Icon name="Plus" className="h-4 w-4" />
                <span className="font-medium">Add new supplier</span>
              </div>
            </Shad.CommandItem>
          </Shad.CommandGroup>
        }
      />
    </div>
  );
};
