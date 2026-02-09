"use client";

import { AnyFieldApi } from "@tanstack/react-form";
import * as React from "react";
import { cn } from "../libs/utils";
import { Icon, Shad, Badge } from "../components";
import { Label } from "../components";
import FieldInfo from "./field-info";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFieldProps {
  label: string;
  placeholder?: string;
  field: AnyFieldApi;
  options: Option[];
  disabled?: boolean;
  subLabel?: string;
}

/**
 * MultiSelectField - Multi-select dropdown component for forms
 * Allows selection of multiple items with visual badge display
 */
const MultiSelectField = ({
  label,
  placeholder = "Select items...",
  field,
  options,
  disabled = false,
  subLabel,
}: MultiSelectFieldProps) => {
  const [open, setOpen] = React.useState(false);
  const selected = (field.state.value || []) as string[];

  const toggleSelection = (value: string) => {
    const newSelection = selected.includes(value)
      ? selected.filter((v: string) => v !== value)
      : [...selected, value];
    field.handleChange(newSelection);
  };

  const removeItem = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = selected.filter((v: string) => v !== value);
    field.handleChange(newSelection);
  };

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => ({ value: opt.value, label: opt.label }));

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Shad.Popover open={open} onOpenChange={setOpen}>
        <Shad.PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            )}
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedLabels.map((item) => (
                  <Badge
                    key={item.value}
                    variant="secondary"
                    className="text-xs px-2 py-0.5"
                  >
                    {item.label}
                    <span
                      onClick={(e) => removeItem(item.value, e)}
                      className="ml-1 hover:text-destructive cursor-pointer inline-flex"
                    >
                      <Icon name="X" className="h-3 w-3" />
                    </span>
                  </Badge>
                ))
              )}
            </div>
            <Icon
              name="ChevronDown"
              className="h-4 w-4 opacity-50 ml-2 shrink-0"
            />
          </button>
        </Shad.PopoverTrigger>
        <Shad.PopoverContent className="w-full p-0" align="start">
          <Shad.Command>
            <Shad.CommandInput placeholder="Search..." className="h-9" />
            <Shad.ScrollArea className="h-60">
              <Shad.CommandList className="overflow-hidden">
                <Shad.CommandEmpty>No results found.</Shad.CommandEmpty>
                <Shad.CommandGroup>
                  {options.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                      <Shad.CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => toggleSelection(option.value)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Icon name="Check" className="h-3 w-3" />
                        </div>
                        <span>{option.label}</span>
                      </Shad.CommandItem>
                    );
                  })}
                </Shad.CommandGroup>
              </Shad.CommandList>
            </Shad.ScrollArea>
          </Shad.Command>
        </Shad.PopoverContent>
      </Shad.Popover>
      {subLabel && <p className="text-sm text-muted-foreground">{subLabel}</p>}
      <FieldInfo field={field} className={cn("text-destructive")} />
    </div>
  );
};

export default MultiSelectField;
