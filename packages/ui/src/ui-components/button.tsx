import { Icon, SButton, Skeleton } from "../components";
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
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
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
  rightIconName,
  variant,
  disabled,
  className,
  children,
  size = "default",
  type = "button",
  formId,
  props,
}: Props) => {
  return (
    <>
      {isSubmitting ? (
        <div className="flex items-center gap-2 h-10 px-4 rounded-md border">
          <Skeleton className="h-5 w-5 rounded-sm" />
          <Skeleton className="h-4 w-24 rounded-sm" />
        </div>
      ) : (
        <SButton
          variant={variant ?? "default"}
          onClick={onClick}
          className={cn(
            "flex-row gap-2 items-center cursor-pointer",
            className
          )}
          disabled={disabled}
          size={size}
          type={type}
          form={formId}
          {...props}
        >
          {iconName && (
            <Icon onClick={onClick} name={iconName ?? "Info"} size={iconSize} />
          )}
          {children}
          {text && <span style={{ color: textColor }}>{text}</span>}
          {rightIconName && <Icon onClick={onClick} name={rightIconName} />}
        </SButton>
      )}
    </>
  );
};
