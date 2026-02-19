import { useForm } from "@tanstack/react-form";
import { useManualLoyaltyAdjustment } from "@/hooks/useLoyalty";
import { Button, Icon, InputField, Shad } from "@repo/ui";
import { useModalStore } from "@/store/modalStore";
import { toast } from "sonner";

type Props = {
  customerId: string;
  customerName: string;
  currentBalance: number;
};

export const ManualAdjustmentForm = ({
  customerId,
  customerName,
  currentBalance,
}: Props) => {
  const { closeModal } = useModalStore();
  const adjustMutation = useManualLoyaltyAdjustment();

  const form = useForm({
    defaultValues: {
      points: "",
      reason: "",
    },
    onSubmit: async ({ value }) => {
      const pointsNum = parseInt(value.points, 10);

      try {
        await adjustMutation.mutateAsync({
          customerId,
          data: {
            points: pointsNum,
            reason: value.reason.trim(),
          },
        });
        toast.success(
          `Adjusted ${pointsNum > 0 ? "+" : ""}${pointsNum} points for ${customerName}`,
        );
        closeModal();
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || "Failed to adjust loyalty points",
        );
      }
    },
  });

  return (
    <div className="sm:max-w-md">
      <div className="flex items-center gap-3 pb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Icon
            name="Award"
            className="w-5 h-5 text-purple-600 dark:text-purple-400"
          />
        </div>
        <div>
          <Shad.DialogTitle>Adjust Loyalty Points</Shad.DialogTitle>
          <p className="text-sm text-muted-foreground">{customerName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 mb-4 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground">Current Balance:</span>
        <span className="text-sm font-bold font-mono">
          {currentBalance.toLocaleString()} pts
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="points"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim() === "") return "Points are required";
              const num = parseInt(value, 10);
              if (isNaN(num)) return "Must be a valid integer";
              if (num === 0) return "Cannot adjust by zero points";
              return undefined;
            },
          }}
        >
          {(field) => (
            <InputField
              label="Points (positive to add, negative to deduct)"
              placeholder="e.g. 100 or -50"
              field={field}
              type="number"
              step="1"
            />
          )}
        </form.Field>

        <form.Field
          name="reason"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim() === "") return "Reason is required";
              if (value.trim().length < 3)
                return "Reason must be at least 3 characters";
              return undefined;
            },
          }}
        >
          {(field) => (
            <InputField
              label="Reason"
              placeholder="e.g. Goodwill credit, Error correction"
              field={field}
            />
          )}
        </form.Field>

        {/* Preview */}
        {(() => {
          const pts = parseInt(form.getFieldValue("points") || "0", 10);
          if (!isNaN(pts) && pts !== 0) {
            const newBalance = currentBalance + pts;
            return (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                <span className="text-muted-foreground">New Balance:</span>
                <span
                  className={`font-bold font-mono ${newBalance < 0 ? "text-destructive" : ""}`}
                >
                  {newBalance.toLocaleString()} pts
                </span>
              </div>
            );
          }
          return null;
        })()}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={closeModal}
            disabled={adjustMutation.isPending}
          >
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  !canSubmit || isSubmitting || adjustMutation.isPending
                }
                isSubmitting={adjustMutation.isPending}
              >
                <Icon name="Award" className="w-4 h-4" />
                Adjust Points
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
};
