import { useState, useMemo } from "react";
import { Badge, Button, Icon, Input, Select, Separator, Shad } from "@repo/ui";
import { useCurrentShift } from "@/hooks/useShifts";
import { useCreateDevice, useDevices } from "@/hooks/useDevices";
import { useBranchStore } from "@/store/branchStore";
import { useShiftStore } from "@/store/shiftStore";
import { useAuthStore } from "@/store/authStore";
import { OpenShiftDialog } from "./OpenShiftDialog";
import { CloseShiftDialog } from "./CloseShiftDialog";
import { CashMovementDialog } from "./CashMovementDialog";
import { ShiftXReportPanel } from "./ShiftXReportPanel";
import { ShiftHistoryTable } from "./ShiftHistoryTable";
import { getShiftStatusVariant, SHIFT_STATUS_LABELS } from "./config";
import type { ShiftFilters } from "@/dto/shift.dto";
import { ShiftStatus } from "@repo/types";
import Heading from "@/components/heading";
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

const SHIFT_HISTORY_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: ShiftStatus.OPEN, label: "Open" },
  { value: ShiftStatus.CLOSED, label: "Closed" },
];

export const ShiftsPage = () => {
  const { branchId } = useBranchStore();
  const { currentDeviceId, setCurrentDeviceId, clearCurrentDeviceId } =
    useShiftStore();
  const { isHighLevelUser } = useAuthStore();

  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [cashMovementOpen, setCashMovementOpen] = useState(false);
  const [showXReport, setShowXReport] = useState(false);
  const [createDeviceOpen, setCreateDeviceOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");

  // History table state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Device list for selection
  const { data: devices = [] } = useDevices(branchId ?? undefined);
  const createDevice = useCreateDevice();
  const posDevices = useMemo(() => devices.filter((d) => !d.isKDS), [devices]);
  const deviceOptions = useMemo(
    () => posDevices.map((d) => ({ value: d.id, label: d.name })),
    [posDevices],
  );

  const { data: currentShift } = useCurrentShift(
    currentDeviceId ?? undefined,
    branchId ?? undefined,
  );

  const historyFilters: ShiftFilters = {
    branchId: branchId ?? undefined,
    ...(statusFilter !== "all" && {
      status: statusFilter as ShiftStatus,
    }),
  };

  const handleCreateDevice = async () => {
    const name = newDeviceName.trim();
    if (!branchId) {
      toast.error("No branch selected");
      return;
    }
    if (!name) {
      toast.error("Device name is required");
      return;
    }

    try {
      const device = await createDevice.mutateAsync({
        name,
        branchId,
        isKDS: false,
      });
      setCurrentDeviceId(device.id);
      setCreateDeviceOpen(false);
      setNewDeviceName("");
      toast.success("Device created");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create device";
      toast.error(message);
    }
  };

  return (
    <div className="pt-4">
      <div className="mx-auto space-y-6">
        <Heading
          title="Shifts"
          subtitle="Manage shift operations, cash movements, and view shift history"
          actions={
            <div className="flex items-center gap-2">
              {!currentDeviceId && (
                <div className="flex items-center gap-2">
                  <Select
                    value={currentDeviceId ?? ""}
                    onChange={(opt) => setCurrentDeviceId(opt.value)}
                    options={deviceOptions}
                    placeholder="Select device"
                    className="w-48"
                  />
                  {isHighLevelUser && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateDeviceOpen(true)}
                      disabled={!branchId}
                    >
                      <Icon name="Plus" className="h-4 w-4 mr-1" />
                      Create Device
                    </Button>
                  )}
                </div>
              )}
              {currentDeviceId &&
              currentShift &&
              currentShift.status === ShiftStatus.OPEN ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCashMovementOpen(true)}
                  >
                    <Icon name="ArrowLeftRight" className="h-4 w-4 mr-1" />
                    Cash Movement
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowXReport(!showXReport)}
                  >
                    <Icon name="FileText" className="h-4 w-4 mr-1" />X Report
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCloseDialogOpen(true)}
                  >
                    <Icon name="Square" className="h-4 w-4 mr-1" />
                    Close Shift
                  </Button>
                </>
              ) : currentDeviceId ? (
                <Button size="sm" onClick={() => setOpenDialogOpen(true)}>
                  <Icon name="Play" className="h-4 w-4 mr-1" />
                  Open Shift
                </Button>
              ) : null}
            </div>
          }
        />

        {/* Device Context Banner */}
        {currentDeviceId && (
          <Shad.Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Icon
                  name="Monitor"
                  className="h-4 w-4 text-muted-foreground"
                />
                <span className="text-muted-foreground">Active Device:</span>
                <span className="font-medium">
                  {posDevices.find((d) => d.id === currentDeviceId)?.name ??
                    currentDeviceId.slice(0, 8)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearCurrentDeviceId()}
                disabled={!!currentShift && currentShift.status === ShiftStatus.OPEN}
              >
                <Icon name="X" className="h-3 w-3 mr-1" />
                Change
              </Button>
            </div>
          </Shad.Card>
        )}

        {!currentDeviceId && branchId && posDevices.length === 0 && (
          <Shad.Card className="p-3 border-dashed">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                No POS devices found for this branch.
              </p>
              {isHighLevelUser ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateDeviceOpen(true)}
                >
                  <Icon name="Plus" className="h-4 w-4 mr-1" />
                  Create Device
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Ask an admin/manager to create a device.
                </span>
              )}
            </div>
          </Shad.Card>
        )}

        {/* Current Shift Card */}
        {currentShift && currentShift.status === ShiftStatus.OPEN && (
          <Shad.Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Icon name="Clock" className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Current Shift</h3>
                    <Badge variant={getShiftStatusVariant(currentShift.status)}>
                      {SHIFT_STATUS_LABELS[currentShift.status] ??
                        currentShift.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Started {formatDateTime(String(currentShift.startTime))} •
                    Opening cash: {formatCurrency(currentShift.startCash)}
                  </p>
                </div>
              </div>
            </div>
          </Shad.Card>
        )}

        {/* X Report Panel */}
        {showXReport && currentShift && (
          <Shad.Card className="p-6">
            <ShiftXReportPanel shiftId={currentShift.id} />
          </Shad.Card>
        )}

        <Separator />

        {/* Shift History */}
        {isHighLevelUser && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Shift History</h2>
                <p className="text-sm text-muted-foreground">
                  View past shifts and their details
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Filter" className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onChange={(opt) => {
                    setStatusFilter(opt.value);
                    setPage(1);
                  }}
                  options={SHIFT_HISTORY_STATUS_OPTIONS}
                  className="w-40"
                />
              </div>
            </div>

            <ShiftHistoryTable
              filters={historyFilters}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        )}

        {/* Dialogs */}
        <Shad.Dialog
          open={createDeviceOpen}
          onOpenChange={(open) => {
            setCreateDeviceOpen(open);
            if (!open) setNewDeviceName("");
          }}
        >
          <Shad.DialogContent className="max-w-md">
            <Shad.DialogHeader>
              <Shad.DialogTitle>
                <div className="flex items-center gap-2">
                  <Icon name="Monitor" className="h-5 w-5" />
                  Create Device
                </div>
              </Shad.DialogTitle>
              <Shad.DialogDescription>
                Add a POS device so shifts can be opened on this branch.
              </Shad.DialogDescription>
            </Shad.DialogHeader>
            <div className="space-y-2 py-2">
              <label className="text-sm font-medium">Device Name</label>
              <Input
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="e.g. Front Counter POS"
                maxLength={80}
              />
            </div>
            <Shad.DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDeviceOpen(false);
                  setNewDeviceName("");
                }}
                disabled={createDevice.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDevice}
                isSubmitting={createDevice.isPending}
              >
                <Icon name="Plus" className="h-4 w-4 mr-1" />
                Create Device
              </Button>
            </Shad.DialogFooter>
          </Shad.DialogContent>
        </Shad.Dialog>

        <OpenShiftDialog
          isOpen={openDialogOpen}
          onClose={() => setOpenDialogOpen(false)}
          deviceId={currentDeviceId ?? ""}
        />

        {currentShift && (
          <>
            <CloseShiftDialog
              isOpen={closeDialogOpen}
              onClose={() => setCloseDialogOpen(false)}
              shiftId={currentShift.id}
            />
            <CashMovementDialog
              isOpen={cashMovementOpen}
              onClose={() => setCashMovementOpen(false)}
              shiftId={currentShift.id}
            />
          </>
        )}
      </div>
    </div>
  );
};
