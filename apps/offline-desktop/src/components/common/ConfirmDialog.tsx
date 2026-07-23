import { Button, Shad } from "@repo/ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  isPending,
}: Props) => (
  <Shad.AlertDialog open={open} onOpenChange={onOpenChange}>
    <Shad.AlertDialogContent>
      <Shad.AlertDialogHeader>
        <Shad.AlertDialogTitle>{title}</Shad.AlertDialogTitle>
        <Shad.AlertDialogDescription>{description}</Shad.AlertDialogDescription>
      </Shad.AlertDialogHeader>
      <Shad.AlertDialogFooter>
        <Shad.AlertDialogCancel>Cancel</Shad.AlertDialogCancel>
        <Button
          variant="destructive"
          disabled={isPending}
          isSubmitting={isPending}
          onClick={async () => {
            await onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </Shad.AlertDialogFooter>
    </Shad.AlertDialogContent>
  </Shad.AlertDialog>
);
