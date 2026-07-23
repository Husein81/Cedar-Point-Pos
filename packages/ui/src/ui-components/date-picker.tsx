"use client";

import { useId } from "react";
import { Shad, Label, SButton, Icon } from "../components";
import { Calendar } from "../components/calendar";
import { cn } from "../libs/utils";

type Props = {
  open?: boolean;
  date?: Date;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  onOpenChange?: (open: boolean) => void;
  onDateChange?: (date?: Date) => void;
};

export function DatePicker({
  open,
  label,
  date,
  required,
  error,
  placeholder = "Select date",
  className,
  id,
  onDateChange,
  onOpenChange,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label htmlFor={inputId} className="px-1">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <Shad.Popover open={open} onOpenChange={onOpenChange}>
        <Shad.PopoverTrigger asChild>
          <SButton
            variant="outline"
            id={inputId}
            className={cn(
              "w-48 justify-between font-normal",
              !date && "text-muted-foreground",
              error && "border-destructive",
              className
            )}
          >
            {date ? date.toLocaleDateString() : placeholder}
            <Icon name="Calendar" />
          </SButton>
        </Shad.PopoverTrigger>
        <Shad.PopoverContent
          className="w-auto overflow-hidden p-0"
          align="start"
        >
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={(date?: Date) => {
              onDateChange?.(date);
              onOpenChange?.(false);
            }}
          />
        </Shad.PopoverContent>
      </Shad.Popover>
      {error && (
        <em className="px-1 text-sm font-medium not-italic text-destructive leading-none">
          {error}
        </em>
      )}
    </div>
  );
}
