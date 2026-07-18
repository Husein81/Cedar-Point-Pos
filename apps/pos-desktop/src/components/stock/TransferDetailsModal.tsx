import { TransferWithDetails } from "@/apis/transfersApi";
import { useCancelTransfer, useCompleteTransfer } from "@/hooks/useTransfers";
import { useModalStore } from "@/store/modalStore";
import { Badge, Button } from "@repo/ui";
import { format } from "date-fns";
import { ArrowRight, FileText, PackageCheck, PackageX } from "lucide-react";

interface TransferDetailsModalProps {
  transfer: TransferWithDetails;
}

function StatusBadge({ status }: { status: TransferWithDetails["status"] }) {
  if (status === "COMPLETED") {
    return <Badge className="bg-green-500 text-white">Completed</Badge>;
  }
  if (status === "CANCELLED") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }
  return (
    <Badge variant="outline" className="text-orange-500 border-orange-400">
      Pending
    </Badge>
  );
}

export function TransferDetailsModal({ transfer }: TransferDetailsModalProps) {
  const { closeModal } = useModalStore();

  const { mutate: completeTransfer, isPending: isCompleting } =
    useCompleteTransfer();
  const { mutate: cancelTransfer, isPending: isCancelling } =
    useCancelTransfer();

  const isPending = transfer.status === "PENDING";

  const handleComplete = () => {
    completeTransfer(transfer.id, { onSuccess: () => closeModal() });
  };

  const handleCancel = () => {
    cancelTransfer(transfer.id, { onSuccess: () => closeModal() });
  };

  const totalItems = transfer.items.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );

  return (
    <div className="space-y-5">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-mono">
            #{transfer.id.substring(0, 8).toUpperCase()}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(transfer.createdAt), "dd MMM yyyy, HH:mm")}
          </p>
        </div>
        <StatusBadge status={transfer.status} />
      </div>

      {/* Branch route */}
      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">From</p>
          <p className="font-semibold text-sm">
            {transfer.fromBranch?.name ?? "—"}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">To</p>
          <p className="font-semibold text-sm">
            {transfer.toBranch?.name ?? "—"}
          </p>
        </div>
      </div>

      {/* Meta info */}
      {(transfer.requestor || transfer.completedAt) && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {transfer.requestor && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Requested by
              </p>
              <p>{transfer.requestor.name}</p>
            </div>
          )}
          {transfer.completedAt && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Completed at
              </p>
              <p>{format(new Date(transfer.completedAt), "dd MMM, HH:mm")}</p>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {transfer.notes && (
        <div className="text-sm">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <FileText className="h-3 w-3" /> Notes
          </p>
          <p className="bg-muted/50 rounded-md px-3 py-2 text-sm">
            {transfer.notes}
          </p>
        </div>
      )}

      {/* Items table */}
      <div>
        <p className="text-sm font-medium mb-2">
          Items ({transfer.items.length} product
          {transfer.items.length !== 1 ? "s" : ""} · {totalItems} total qty)
        </p>
        <div className="border rounded-md divide-y max-h-64 overflow-y-auto text-sm">
          {transfer.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div>
                <p className="font-medium">
                  {item.product?.name ?? "Unknown product"}
                </p>
                {item.product?.sku && (
                  <p className="text-xs text-muted-foreground">
                    {item.product.sku}
                  </p>
                )}
              </div>
              <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                × {Number(item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions — only shown for PENDING transfers */}
      {isPending && (
        <div className="flex justify-end gap-3 pt-3 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCompleting || isCancelling}
            className="text-destructive hover:text-destructive"
          >
            {isCancelling ? (
              "Cancelling…"
            ) : (
              <>
                <PackageX className="h-4 w-4 mr-1" />
                Cancel Transfer
              </>
            )}
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isCompleting || isCancelling}
          >
            {isCompleting ? (
              "Completing…"
            ) : (
              <>
                <PackageCheck className="h-4 w-4 mr-1" />
                Complete Transfer
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
