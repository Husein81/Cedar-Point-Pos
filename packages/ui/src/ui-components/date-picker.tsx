"use client";
import { ChevronDownIcon } from "lucide-react";
import { Shad, Label, SButton } from "../components";
import { Calendar } from "../components/calendar";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  date?: Date;
  onDateChange?: (date?: Date) => void;
};
export function DatePicker({ open, onDateChange, onOpenChange, date }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="date" className="px-1">
        Date of birth
      </Label>
      <Shad.Popover open={open} onOpenChange={onOpenChange}>
        <Shad.PopoverTrigger asChild>
          <SButton
            variant="outline"
            id="date"
            className="w-48 justify-between font-normal"
          >
            {date ? date.toLocaleDateString() : "Select date"}
            <ChevronDownIcon />
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
