"use client";
// global imports
import { AnyFieldApi } from "@tanstack/react-form";
import { useState } from "react";

//  local imports
import { Input, Label } from "../components";
import { Icon } from "../components/icon";
import FieldInfo from "./field-info";
import { cn } from "../libs/utils";

type Props = {
  label: string;
  field: AnyFieldApi;
  placeholder?: string;
  subLabel?: string;
} & React.ComponentProps<"input">;

const InputField = ({
  label,
  field,
  subLabel,
  placeholder,
  type = "text",
  ...props
}: Props) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {label}
        {props.required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="relative">
        <Input
          name={field.name}
          type={isPassword && showPassword ? "text" : type}
          value={field.state.value ?? ""}
          placeholder={placeholder}
          onBlur={field.handleBlur}
          {...props}
          onChange={(e) => field.handleChange(e.target.value)}
        />
        {isPassword && (
          <Icon
            name={showPassword ? "Eye" : "EyeOff"}
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              "cursor-pointer absolute right-2 top-1/2 -translate-y-1/2"
            )}
          />
        )}
        {subLabel && (
          <p className="text-muted-foreground mt-2 text-xs">{subLabel}</p>
        )}
      </div>
      <FieldInfo field={field} className={cn("text-destructive")} />
    </div>
  );
};

export default InputField;
