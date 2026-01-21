"use client";

import { Shad, Label, SButton, Icon } from "../components";
import { Calendar } from "../components/calendar";

type Props = {
  open?: boolean;
  date?: Date;
  label?: string;
  onOpenChange?: (open: boolean) => void;
  onDateChange?: (date?: Date) => void;
};

export function DatePicker({
  open,
  label,
  date,
  onDateChange,
  onOpenChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {label && (
        <Label htmlFor="date" className="px-1">
          {label}
        </Label>
      )}
      <Shad.Popover open={open} onOpenChange={onOpenChange}>
        <Shad.PopoverTrigger asChild>
          <SButton
            variant="outline"
            id="date"
            className="w-48 justify-between font-normal"
          >
            {date ? date.toLocaleDateString() : "Select date"}
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
    </div>
  );
}
