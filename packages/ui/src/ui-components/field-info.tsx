import { cn } from "@repo/ui/lib/utils";
import type { AnyFieldApi } from "@tanstack/react-form";

function FieldInfo({
  field,
  className,
}: {
  field: AnyFieldApi;
  className?: string;
}) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em
          className={cn(
            "text-sm font-medium text-destructive leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            className
          )}
        >
          {field.state.meta.errors.join(", ")}
        </em>
      ) : null}
      {field.state.meta.isValidating ? (
        <em
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          )}
        >
          {"Validating..."}
        </em>
      ) : null}
    </>
  );
}

export default FieldInfo;
