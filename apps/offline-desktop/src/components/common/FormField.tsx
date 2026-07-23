// React Hook Form flavored version of @repo/ui's InputField —
// identical markup/styling, but driven by RHF register + error props.

import { useState } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { cn, Icon, Input, Label } from "@repo/ui";

type Props = {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  placeholder?: string;
  subLabel?: string;
} & Omit<React.ComponentProps<"input">, "name">;

export const FormField = ({
  label,
  error,
  registration,
  subLabel,
  placeholder,
  type = "text",
  ...props
}: Props) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  return (
    <div className="space-y-2">
      <Label htmlFor={registration.name}>
        {label}
        {props.required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="relative">
        <Input
          id={registration.name}
          type={isPassword && showPassword ? "text" : type}
          placeholder={placeholder}
          {...props}
          {...registration}
        />
        {isPassword && (
          <Icon
            name={showPassword ? "Eye" : "EyeOff"}
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              "cursor-pointer absolute right-2 top-1/2 -translate-y-1/2",
            )}
          />
        )}
        {subLabel && (
          <p className="text-muted-foreground mt-2 text-xs">{subLabel}</p>
        )}
      </div>
      {error ? (
        <p className="text-destructive text-xs">{error.message}</p>
      ) : null}
    </div>
  );
};
