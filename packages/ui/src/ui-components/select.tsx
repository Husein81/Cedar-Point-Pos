"use client";

import { Shad } from "../components";
import { cn } from "../libs/utils";

// packages imports

type Option = {
  value: string;
  label: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (value: Option) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  side?: "top" | "right" | "bottom" | "left" | undefined;
};

function Select({
  options,
  value,
  onChange,
  placeholder = "select.placeholder",
  label,
  className,
  side,
  disabled,
}: Props) {
  return (
    <Shad.Select
      value={value ?? undefined}
      onValueChange={(val) => {
        const selected = options.find((opt) => opt.value === val);
        if (selected) onChange(selected);
      }}
      disabled={disabled}
    >
      <Shad.SelectTrigger className={cn("w-[250px]", className)}>
        <Shad.SelectValue
          className={cn("text-text text-sm native:text-lg")}
          placeholder={placeholder}
        />
      </Shad.SelectTrigger>
      <Shad.SelectContent
        side={side}
        className="w-[var(--radix-select-trigger-width)]"
      >
        <Shad.ScrollArea>
          <Shad.SelectGroup>
            {label && <Shad.SelectLabel>{label}</Shad.SelectLabel>}
            {options.length > 0 ? (
              options.map((option, index) => (
                <Shad.SelectItem key={index} value={option.value}>
                  {option.label}
                </Shad.SelectItem>
              ))
            ) : (
              <Shad.SelectItem value="no-options">
                No Options Available
              </Shad.SelectItem>
            )}
          </Shad.SelectGroup>
        </Shad.ScrollArea>
      </Shad.SelectContent>
    </Shad.Select>
  );
}

export default Select;
