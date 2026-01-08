import { Icon, SButton, Shad, cn } from "@repo/ui";

type AlertVariant = "default" | "warning" | "delete";

type Props = {
  label?: string;
  title: string;
  description?: string;
  icon?: string;
  iconButton?: string;
  size?:
    | "default"
    | "sm"
    | "lg"
    | "icon"
    | "icon-sm"
    | "icon-lg"
    | null
    | undefined;
  variant?: AlertVariant;
  buttonVariant?: "default" | "outline" | "destructive" | "ghost";
  section?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
};

const variantConfig: Record<
  AlertVariant,
  {
    icon: string;
    titleClass: string;
    buttonVariant: "default" | "destructive";
  }
> = {
  default: {
    icon: "CircleAlert",
    titleClass: "text-foreground",
    buttonVariant: "default",
  },
  warning: {
    icon: "CircleAlert",
    titleClass: "text-yellow-600",
    buttonVariant: "default",
  },
  delete: {
    icon: "Trash2",
    titleClass: "text-red-600",
    buttonVariant: "destructive",
  },
};

const AlertDialog = ({
  label,
  title,
  description,
  icon,
  iconButton,
  size = "default",
  section,
  variant = "default",
  buttonVariant = "default",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
}: Props) => {
  const config = variantConfig[variant];

  return (
    <Shad.AlertDialog>
      <Shad.AlertDialogTrigger asChild>
        <div>
          {(iconButton || label) && (
            <SButton
              size={size}
              variant={buttonVariant ?? config.buttonVariant}
              className="flex items-center gap-2"
            >
              <Icon name={iconButton ?? config.icon} className="h-4 w-4" />
              {label}
            </SButton>
          )}
          {icon && <Icon name={icon ?? config.icon} className="h-4 w-4" />}
        </div>
      </Shad.AlertDialogTrigger>

      <Shad.AlertDialogContent className="max-w-md">
        {/* Header */}
        <Shad.AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                variant === "delete" && "bg-red-100 text-red-600",
                variant === "warning" && "bg-yellow-100 text-yellow-600",
                variant === "default" && "bg-muted text-foreground"
              )}
            >
              <Icon name={config.icon} className="h-5 w-5" />
            </div>

            <Shad.AlertDialogTitle
              className={cn("text-lg font-semibold", config.titleClass)}
            >
              {title}
            </Shad.AlertDialogTitle>
          </div>

          {description && (
            <Shad.AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </Shad.AlertDialogDescription>
          )}
          {section && <div>{section}</div>}
        </Shad.AlertDialogHeader>

        {/* Footer */}
        <Shad.AlertDialogFooter className="mt-6">
          <Shad.AlertDialogCancel asChild>
            <SButton variant="ghost">{cancelText}</SButton>
          </Shad.AlertDialogCancel>

          <Shad.AlertDialogAction asChild>
            <SButton variant={config.buttonVariant} onClick={onConfirm}>
              {confirmText}
            </SButton>
          </Shad.AlertDialogAction>
        </Shad.AlertDialogFooter>
      </Shad.AlertDialogContent>
    </Shad.AlertDialog>
  );
};

export default AlertDialog;
