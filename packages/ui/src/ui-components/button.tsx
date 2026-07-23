import { Icon, SButton } from "../components";
import { cn } from "../libs/utils";

type Props = {
  onClick?: (args?: unknown) => void;
  children?: React.ReactNode;
  iconName?: string;
  iconSize?: string | number;
  text?: string;
  textColor?: string;
  rightIconName?: string;
  isSubmitting?: boolean;
  submitting?: string;
  className?: string;
  disabled?: boolean;
  variant?:
    | "link"
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | null
    | undefined;
  size?:
    | "default"
    | "sm"
    | "lg"
    | "icon"
    | "icon-sm"
    | "icon-lg"
    | null
    | undefined;
  formId?: string;
  type?: "button" | "submit" | "reset";
  props?: React.ComponentProps<typeof SButton | "button">;
};

export const Button = ({
  onClick,
  iconName,
  iconSize,
  text,
  textColor,
  isSubmitting,
  submitting = "Saving...",
  rightIconName,
  variant,
  disabled,
  className,
  children,
  size = "default",
  type = "button",
  formId,
  ...props
}: Props) => {
  return (
    <SButton
      variant={variant ?? "default"}
      onClick={onClick}
      className={cn("flex-row gap-2 items-center cursor-pointer", className)}
      disabled={disabled}
      size={size}
      type={type}
      form={formId}
      {...props}
    >
      {isSubmitting ? (
        <div className="flex items-center gap-2">
          <Icon
            name="LoaderCircle"
            className="animate-spin"
            size={iconSize || 16}
          />
          <span>{submitting}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {iconName && (
            <Icon onClick={onClick} name={iconName ?? "Info"} size={iconSize} />
          )}
          {children}
          {text && <span style={{ color: textColor }}>{text}</span>}
          {rightIconName && <Icon onClick={onClick} name={rightIconName} />}
        </div>
      )}
    </SButton>
  );
};
