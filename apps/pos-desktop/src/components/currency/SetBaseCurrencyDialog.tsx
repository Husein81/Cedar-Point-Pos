import { Button, Icon, Shad } from "@repo/ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencyCode: string;
  currencyName: string;
  onConfirm: () => void;
  isLoading?: boolean;
};

export const SetBaseCurrencyDialog = ({
  open,
  onOpenChange,
  currencyCode,
  currencyName,
  onConfirm,
  isLoading,
}: Props) => {
  return (
    <Shad.AlertDialog open={open} onOpenChange={onOpenChange}>
      <Shad.AlertDialogContent>
        <Shad.AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900">
              <Icon
                name="AlertTriangle"
                className="w-5 h-5 text-amber-600 dark:text-amber-400"
              />
            </div>
            <Shad.AlertDialogTitle>
              Change Base Currency to {currencyCode}?
            </Shad.AlertDialogTitle>
          </div>
          <Shad.AlertDialogDescription asChild>
            <div className="space-y-3 text-muted-foreground">
              <p>
                You are about to set{" "}
                <strong>
                  {currencyName} ({currencyCode})
                </strong>{" "}
                as your base currency for accounting and reporting.
              </p>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
                <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Icon name="Info" className="w-4 h-4" />
                  Important Information
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  <li>
                    All reports will use this currency as the primary
                    denomination
                  </li>
                  <li>
                    Exchange rates for other currencies will be relative to this
                    currency
                  </li>
                  <li>
                    Past orders retain their original currency and exchange rate
                    snapshots
                  </li>
                  <li>This change affects future orders and reporting only</li>
                </ul>
              </div>

              <p className="text-sm">
                The exchange rate for {currencyCode} will automatically be set
                to 1.00.
              </p>
            </div>
          </Shad.AlertDialogDescription>
        </Shad.AlertDialogHeader>
        <Shad.AlertDialogFooter>
          <Shad.AlertDialogCancel disabled={isLoading}>
            Cancel
          </Shad.AlertDialogCancel>
          <Button
            onClick={onConfirm}
            isSubmitting={isLoading}
            disabled={isLoading}
          >
            Confirm Change
          </Button>
        </Shad.AlertDialogFooter>
      </Shad.AlertDialogContent>
    </Shad.AlertDialog>
  );
};
