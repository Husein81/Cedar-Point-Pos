import { Button, Icon, Shad } from "@repo/ui";
import { cn } from "@repo/ui";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "default" | "destructive" | "warning";
}

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmationDialogProps) => {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="sm:max-w-md">
        <Shad.DialogHeader>
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  variant === "destructive" && "bg-destructive/10",
                  variant === "warning" && "bg-amber-500/10",
                  variant === "default" && "bg-primary/10"
                )}
              >
                <Icon
                  name={icon}
                  className={cn(
                    "w-5 h-5",
                    variant === "destructive" && "text-destructive",
                    variant === "warning" && "text-amber-500",
                    variant === "default" && "text-primary"
                  )}
                />
              </div>
            )}
            <div className="flex-1">
              <Shad.DialogTitle>{title}</Shad.DialogTitle>
            </div>
          </div>
          <Shad.DialogDescription className="pt-2">
            {description}
          </Shad.DialogDescription>
        </Shad.DialogHeader>
        <Shad.DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
