"use client";

import * as React from "react";
import { cn } from "../libs/utils";
import { Icon, SButton, Shad, Skeleton } from "../components";
import { Empty } from "./empty";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface ComboboxProps {
  /** Options to display in the combobox */
  options: ComboboxOption[];
  /** Currently selected value */
  value?: string | null;
  /** Callback when value changes */
  onValueChange?: (value: string | null) => void;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Text to show when no options match search */
  emptyText?: string;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Whether to show loading state */
  isLoading?: boolean;
  /** Class name for the trigger button */
  className?: string;
  /** Width of the Shad.popover content */
  popoverWidth?: string;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Search query (for async search) */
  searchQuery?: string;
  /** Callback when search query changes (for async search) */
  onSearchChange?: (query: string) => void;
  /** Whether to disable internal filtering (for async search) */
  shouldFilter?: boolean;
  /** Icon to show on the trigger button */
  triggerIcon?: React.ReactNode;
  /** Additional content to render at the bottom of the list */
  footer?: React.ReactNode;
  /** Render custom option content */
  renderOption?: (
    option: ComboboxOption,
    isSelected: boolean,
  ) => React.ReactNode;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  isLoading = false,
  className,
  popoverWidth = "w-full",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  searchQuery: controlledSearchQuery,
  onSearchChange,
  shouldFilter = true,
  triggerIcon,
  footer,
  renderOption,
}: ComboboxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = React.useState("");

  // Support both controlled and uncontrolled modes
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const searchQuery =
    controlledSearchQuery !== undefined
      ? controlledSearchQuery
      : internalSearchQuery;

  const handleSearchChange = (query: string) => {
    if (onSearchChange) {
      onSearchChange(query);
    } else {
      setInternalSearchQuery(query);
    }
  };

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (currentValue: string) => {
    // Toggle selection if clicking the same value
    const newValue = currentValue === value ? null : currentValue;
    onValueChange?.(newValue);
    setOpen(false);
    handleSearchChange("");
  };

  return (
    <Shad.Popover open={open} onOpenChange={setOpen}>
      <Shad.PopoverTrigger asChild>
        <SButton
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", className)}
        >
          <div className="flex items-center gap-2 truncate">
            {triggerIcon}
            <span className={cn(!selectedOption && "text-muted-foreground")}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <Icon
            name="ChevronsUpDown"
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
          />
        </SButton>
      </Shad.PopoverTrigger>
      <Shad.PopoverContent className={cn("p-0", popoverWidth)} align="start">
        <Shad.Command shouldFilter={shouldFilter}>
          <Shad.CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={handleSearchChange}
            className="h-9"
          />
          {/* Loading state */}
          {isLoading ? (
            <div className="p-2 space-y-2">
              <Skeleton className="h-8 w-full bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
            </div>
          ) : (
            <Shad.ScrollArea className="h-60">
              <Shad.CommandList className="overflow-hidden">
                {/* Empty state */}
                <Shad.CommandEmpty>
                  <Empty title={emptyText} />
                </Shad.CommandEmpty>
                {/* Options list */}
                {options.length > 0 && (
                  <Shad.CommandGroup>
                    {options.map((option) => {
                      const isSelected = value === option.value;
                      return (
                        <Shad.CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={handleSelect}
                          className="cursor-pointer"
                        >
                          {renderOption ? (
                            renderOption(option, isSelected)
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {option.icon}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate">{option.label}</p>
                                  {option.description && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {option.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Icon
                                name="Check"
                                className={cn(
                                  "ml-auto h-4 w-4 shrink-0",
                                  isSelected ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </>
                          )}
                        </Shad.CommandItem>
                      );
                    })}
                  </Shad.CommandGroup>
                )}
              </Shad.CommandList>
            </Shad.ScrollArea>
          )}
          {/* Footer content */}
          {footer && (
            <>
              <Shad.CommandSeparator />
              {footer}
            </>
          )}
        </Shad.Command>
      </Shad.PopoverContent>
    </Shad.Popover>
  );
}
