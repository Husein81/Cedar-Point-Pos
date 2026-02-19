import { useState } from "react";
import { Button, Icon, Input, Shad } from "@repo/ui";
import { useOpenShift } from "@/hooks/useShifts";
import { useBranchStore } from "@/store/branchStore";
import { useShiftStore } from "@/store/shiftStore";
import { toast } from "sonner";

interface OpenShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
}

export const OpenShiftDialog = ({
  isOpen,
  onClose,
  deviceId,
}: OpenShiftDialogProps) => {
  const { branchId } = useBranchStore();
  const { setShiftContext } = useShiftStore();
  const openShiftMutation = useOpenShift();
  const [startCash, setStartCash] = useState<string>("0");

  const handleOpen = async () => {
    if (!branchId) {
      toast.error("Branch is required to open a shift");
      return;
    }
    if (!deviceId) {
      toast.error("Device is required to open a shift");
      return;
    }

    try {
      const shift = await openShiftMutation.mutateAsync({
        branchId,
        deviceId,
        startCash: parseFloat(startCash) || 0,
      });
      setShiftContext(shift.id, deviceId);
      toast.success("Shift opened successfully");
      setStartCash("0");
      onClose();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to open shift";
      toast.error(message);
    }
  };

  return (
    <Shad.Dialog open={isOpen} onOpenChange={onClose}>
      <Shad.DialogContent className="max-w-md">
        <Shad.DialogHeader>
          <Shad.DialogTitle className="flex items-center gap-2">
            <Icon name="Play" className="h-5 w-5" />
            Open New Shift
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            Start a new shift for this device. Enter the starting cash amount.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Starting Cash</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={startCash}
              onChange={(e) => setStartCash(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount of cash in the drawer at the start of this shift.
            </p>
          </div>
        </div>

        <Shad.DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleOpen}
            isSubmitting={openShiftMutation.isPending}
          >
            <Icon name="Play" className="h-4 w-4 mr-1" />
            Open Shift
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
