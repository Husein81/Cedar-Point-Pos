"use client";
// global imports
import { AnyFieldApi } from "@tanstack/react-form";

//  local imports
import { Label, Textarea } from "../components";
import FieldInfo from "./field-info";
import { cn } from "../libs/utils";

type Props = {
  label: string;
  field: AnyFieldApi;
  placeholder?: string;
} & React.ComponentProps<"textarea">;

const InputField = ({ label, field, placeholder }: Props) => {
  return (
    <div>
      <Label htmlFor={field.name}>{label}:</Label>
      <div className="relative">
        <Textarea
          name={field.name}
          value={field.state.value ?? ""}
          placeholder={placeholder}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      </div>
      <FieldInfo field={field} className={cn("text-destructive")} />
    </div>
  );
};

export default InputField;
