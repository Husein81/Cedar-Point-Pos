import { useState } from "react";
import { Badge, Button, Icon, Shad, Skeleton } from "@repo/ui";
import { useShift, useApproveClose } from "@/hooks/useShifts";
import { useAuthStore } from "@/store/authStore";
import { ShiftXReportPanel } from "./ShiftXReportPanel";
import type { ShiftDetailPanelProps } from "@/dto/shift.dto";
import {
  getShiftStatusVariant,
  getShiftCloseResultVariant,
  SHIFT_STATUS_LABELS,
  SHIFT_CLOSE_RESULT_LABELS,
} from "./config";
import { toast } from "sonner";

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return `$${Number(value).toFixed(2)}`;
};

export const ShiftDetailPanel = ({ shiftId }: ShiftDetailPanelProps) => {
  const { data: shift, isLoading } = useShift(shiftId);
  const { isHighLevelUser } = useAuthStore();
  const approveCloseMutation = useApproveClose();
  const [approvalNote, setApprovalNote] = useState("");
  const [showApproval, setShowApproval] = useState(false);

  const handleApprove = async () => {
    try {
      await approveCloseMutation.mutateAsync({
        id: shiftId,
        data: { approvalNote: approvalNote || undefined },
      });
      toast.success("Shift close approved");
      setShowApproval(false);
      setApprovalNote("");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to approve shift close";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Icon name="FileX" className="h-8 w-8 mx-auto mb-2" />
        <p>Shift not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Shift Details</h2>
          <Badge variant={getShiftStatusVariant(shift.status)}>
            {SHIFT_STATUS_LABELS[shift.status] ?? shift.status}
          </Badge>
          {shift.closeResult && (
            <Badge variant={getShiftCloseResultVariant(shift.closeResult)}>
              {SHIFT_CLOSE_RESULT_LABELS[shift.closeResult] ??
                shift.closeResult}
            </Badge>
          )}
        </div>

        {shift.closeResult === "NEEDS_APPROVAL" && isHighLevelUser && (
          <Button size="sm" onClick={() => setShowApproval(true)}>
            <Icon name="CheckCircle" className="h-4 w-4 mr-1" />
            Approve
          </Button>
        )}
      </div>

      {/* Approval form */}
      {showApproval && (
        <Shad.Card className="p-4 border-primary">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Approve Shift Close</h4>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Approval note (optional)..."
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApproval(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                isSubmitting={approveCloseMutation.isPending}
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        </Shad.Card>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Shift ID</p>
          <p className="text-sm font-mono">{shift.id.slice(0, 12)}...</p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Started</p>
          <p className="text-sm font-medium">
            {formatDateTime(String(shift.startTime))}
          </p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Ended</p>
          <p className="text-sm font-medium">
            {shift.endTime
              ? formatDateTime(String(shift.endTime))
              : "Still Open"}
          </p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Close Mode</p>
          <p className="text-sm font-medium">{shift.closeMode ?? "-"}</p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Start Cash</p>
          <p className="text-sm font-semibold">
            {formatCurrency(shift.startCash)}
          </p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">End Cash</p>
          <p className="text-sm font-semibold">
            {formatCurrency(shift.endCash)}
          </p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Actual Cash</p>
          <p className="text-sm font-semibold">
            {formatCurrency(shift.actualCash)}
          </p>
        </Shad.Card>
        <Shad.Card className="p-3">
          <p className="text-xs text-muted-foreground">Difference</p>
          {(() => {
            const diff = shift.difference;
            if (diff === null || diff === undefined)
              return <p className="text-sm font-semibold">-</p>;
            const numDiff = Number(diff);
            return (
              <p
                className={`text-sm font-semibold ${numDiff > 0 ? "text-green-600" : numDiff < 0 ? "text-destructive" : ""}`}
              >
                {formatCurrency(diff)}
              </p>
            );
          })()}
        </Shad.Card>
      </div>

      {/* Notes */}
      {shift.notes && (
        <Shad.Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{shift.notes}</p>
        </Shad.Card>
      )}

      {shift.approvalNote && (
        <Shad.Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Approval Note</p>
          <p className="text-sm">{shift.approvalNote}</p>
        </Shad.Card>
      )}

      {/* X Report */}
      <ShiftXReportPanel shiftId={shiftId} />
    </div>
  );
};
