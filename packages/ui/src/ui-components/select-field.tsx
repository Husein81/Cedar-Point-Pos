"use client";
import { AnyFieldApi } from "@tanstack/react-form";
import { Label } from "../components";
import { cn } from "../libs/utils";
import FieldInfo from "./field-info";
import Select from "./select";

type Option = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  field: AnyFieldApi;
  placeholder?: string;
  className?: string;
  options: Option[];
  onChange?: (value: Option) => void;
};

const SelectField = ({
  label,
  field,
  options,
  placeholder,
  className,
  onChange,
}: Props) => {
  return (
    <div>
      <Label htmlFor={field.name}>{label}</Label>
      <div className="relative">
        <Select
          options={options}
          className={cn("w-full", className)}
          value={field.state.value ?? ""}
          placeholder={placeholder}
          onChange={(opt) => {
            field.handleChange(opt.value);
            onChange?.(opt);
          }}
        />
      </div>
      <FieldInfo
        field={field}
        className={cn("text-destructive")}
      />
    </div>
  );
};

export default SelectField;
