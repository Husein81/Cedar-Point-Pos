import { useState } from "react";
import { Button, Icon, Input, Shad } from "@repo/ui";
import { useClosePreview, useCloseShift } from "@/hooks/useShifts";
import { useShiftStore } from "@/store/shiftStore";
import type { ClosePreviewResponse } from "@/apis/shiftsApi";
import type { ShiftCloseMode } from "@repo/types";
import { toast } from "sonner";

interface CloseShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
}

export const CloseShiftDialog = ({
  isOpen,
  onClose,
  shiftId,
}: CloseShiftDialogProps) => {
  const { clearShiftContext } = useShiftStore();
  const closePreviewMutation = useClosePreview();
  const closeShiftMutation = useCloseShift();

  const [countedCash, setCountedCash] = useState<string>("");
  const [closeMode, setCloseMode] = useState<ShiftCloseMode>("NORMAL");
  const [notes, setNotes] = useState<string>("");
  const [preview, setPreview] = useState<ClosePreviewResponse | null>(null);
  const [step, setStep] = useState<"input" | "preview">("input");

  const handlePreview = async () => {
    if (!countedCash && closeMode === "NORMAL") {
      toast.error("Please enter counted cash amount");
      return;
    }

    try {
      const data = await closePreviewMutation.mutateAsync({
        id: shiftId,
        data: {
          countedCash: parseFloat(countedCash) || 0,
          closeMode,
        },
      });
      setPreview(data);
      setStep("preview");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to generate close preview";
      toast.error(message);
    }
  };

  const handleClose = async () => {
    try {
      const shift = await closeShiftMutation.mutateAsync({
        id: shiftId,
        data: {
          countedCash: parseFloat(countedCash) || 0,
          closeMode,
          notes: notes || undefined,
        },
      });

      if (shift.closeResult === "NEEDS_APPROVAL") {
        toast.warning(
          "Shift closed but requires manager approval due to cash variance",
        );
      } else {
        toast.success("Shift closed successfully");
      }

      clearShiftContext();
      resetAndClose();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to close shift";
      toast.error(message);
    }
  };

  const resetAndClose = () => {
    setCountedCash("");
    setCloseMode("NORMAL");
    setNotes("");
    setPreview(null);
    setStep("input");
    onClose();
  };

  return (
    <Shad.Dialog open={isOpen} onOpenChange={resetAndClose}>
      <Shad.DialogContent className="max-w-md">
        <Shad.DialogHeader>
          <Shad.DialogTitle className="flex items-center gap-2">
            <Icon name="Square" className="h-5 w-5" />
            Close Shift
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            {step === "input"
              ? "Count your cash drawer and enter the total below."
              : "Review the close preview before confirming."}
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        {step === "input" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Close Mode</label>
              <div className="flex gap-2">
                <Button
                  variant={closeMode === "NORMAL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCloseMode("NORMAL")}
                >
                  Normal
                </Button>
                <Button
                  variant={closeMode === "BLIND" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCloseMode("BLIND")}
                >
                  Blind
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {closeMode === "NORMAL"
                  ? "You will see the expected cash before confirming."
                  : "Enter your count first; expected cash is revealed after."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Counted Cash</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this shift..."
              />
            </div>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Expected Cash</p>
                <p className="text-lg font-semibold">
                  ${(preview.expectedCash ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Counted Cash</p>
                <p className="text-lg font-semibold">
                  $
                  {(
                    preview.countedCash ??
                    (parseFloat(countedCash) || 0)
                  ).toFixed(2)}
                </p>
              </div>
              {preview.varianceAmount !== undefined &&
                preview.varianceAmount !== null && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Variance</p>
                    <p
                      className={`text-lg font-semibold ${
                        preview.varianceAmount > 0
                          ? "text-green-600"
                          : preview.varianceAmount < 0
                            ? "text-destructive"
                            : ""
                      }`}
                    >
                      ${preview.varianceAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              {preview.variancePercent !== undefined &&
                preview.variancePercent !== null && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Variance %</p>
                    <p className="text-lg font-semibold">
                      {preview.variancePercent.toFixed(2)}%
                    </p>
                  </div>
                )}
            </div>

            {preview.needsApproval && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <Icon
                  name="TriangleAlert"
                  className="h-4 w-4 text-destructive"
                />
                <p className="text-sm text-destructive">
                  This close will require manager approval due to cash variance.
                </p>
              </div>
            )}
          </div>
        )}

        <Shad.DialogFooter>
          {step === "input" ? (
            <>
              <Button variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button
                onClick={handlePreview}
                isSubmitting={closePreviewMutation.isPending}
              >
                <Icon name="Eye" className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>
                Back
              </Button>
              <Button
                onClick={handleClose}
                isSubmitting={closeShiftMutation.isPending}
                variant="destructive"
              >
                <Icon name="Square" className="h-4 w-4 mr-1" />
                Confirm Close
              </Button>
            </>
          )}
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
