import { AnyFieldApi } from "@tanstack/react-form";
import { Switch } from "../components/switch";
import { Label } from "../components";
import FieldInfo from "./field-info";

type Props = {
  label: string;
  field: AnyFieldApi;
  subLabel?: string;
} & Omit<
  React.ComponentPropsWithoutRef<typeof Switch>,
  "id" | "name" | "checked" | "onCheckedChange"
>;

const SwitchField = ({ label, field, subLabel, ...props }: Props) => {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={field.name}>{label}</Label>
      <Switch
        id={field.name}
        name={field.name}
        checked={field.state.value}
        onCheckedChange={(checked: boolean) => field.handleChange(checked)}
        {...props}
      />
      {subLabel && (
        <p className="text-muted-foreground mt-2 text-xs">{subLabel}</p>
      )}
      <FieldInfo field={field} className={"text-destructive"} />
    </div>
  );
};
export default SwitchField;
