import { useState, useCallback } from "react";
import { Button, Icon, Select, Shad } from "@repo/ui";
import { useBranchStore } from "@/store/branchStore";
import { useAuthStore } from "@/store/authStore";
import {
  useDeleteSchedule,
  usePublishSchedules,
  useUnpublishSchedules,
} from "@/hooks/useShiftSchedules";
import { ShiftScheduleFormDialog } from "./ShiftScheduleFormDialog";
import { ShiftSchedulesTable } from "./ShiftSchedulesTable";
import type { ShiftSchedule, ShiftScheduleStatus } from "@repo/types";
import type { ScheduleFilters } from "@/dto/shift.dto";
import { toast } from "sonner";
import Heading from "@/components/heading";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "STARTED", label: "Started" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const ShiftSchedulesPage = () => {
  const { branchId } = useBranchStore();
  const { isHighLevelUser } = useAuthStore();

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ShiftSchedule | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ShiftSchedule | null>(null);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Mutations
  const deleteSchedule = useDeleteSchedule();
  const publishSchedules = usePublishSchedules();
  const unpublishSchedules = useUnpublishSchedules();

  const filters: ScheduleFilters = {
    branchId: branchId ?? undefined,
    ...(statusFilter !== "all" && {
      status: statusFilter as ShiftScheduleStatus,
    }),
  };

  const handleCreate = () => {
    if (!branchId) {
      toast.error("Select a branch before creating a schedule");
      return;
    }
    setEditingSchedule(null);
    setFormOpen(true);
  };

  const handleEdit = (schedule: ShiftSchedule) => {
    setEditingSchedule(schedule);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSchedule.mutateAsync(deleteTarget.id);
      toast.success("Schedule deleted");
      setDeleteTarget(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast.error(message);
    }
  };

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleToggleSelectAll = useCallback((visibleIds: string[]) => {
    setSelectedIds((prev) =>
      prev.length === visibleIds.length &&
      visibleIds.every((id) => prev.includes(id))
        ? []
        : visibleIds,
    );
  }, []);

  const handlePublish = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one schedule to publish");
      return;
    }
    try {
      await publishSchedules.mutateAsync({ ids: selectedIds });
      toast.success(`Published ${selectedIds.length} schedule(s)`);
      setSelectedIds([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Publish failed";
      toast.error(message);
    }
  };

  const handleUnpublish = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one schedule to unpublish");
      return;
    }
    try {
      await unpublishSchedules.mutateAsync({ ids: selectedIds });
      toast.success(`Unpublished ${selectedIds.length} schedule(s)`);
      setSelectedIds([]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unpublish failed";
      toast.error(message);
    }
  };

  if (!isHighLevelUser) {
    return (
      <div className="pt-4 text-center text-muted-foreground">
        <p>You do not have permission to manage schedules.</p>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="mx-auto space-y-6">
        <Heading
          title="Shift Schedules"
          subtitle="Create, manage, and publish shift schedules for your team"
          href="/shifts"
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!branchId}>
                <Icon name="Plus" className="h-4 w-4 mr-1" />
                New Schedule
              </Button>
            </div>
          }
        />

        {!branchId && (
          <Shad.Card className="p-3 border-dashed">
            <p className="text-sm text-muted-foreground">
              Select a branch first to create schedules.
            </p>
          </Shad.Card>
        )}

        {/* Filters & Bulk Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Icon name="Filter" className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onChange={(opt) => {
                  setStatusFilter(opt.value);
                  setPage(1);
                }}
                options={STATUS_OPTIONS}
                className="w-40"
              />
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePublish}
                disabled={publishSchedules.isPending}
              >
                <Icon name="Send" className="h-4 w-4 mr-1" />
                Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnpublish}
                disabled={unpublishSchedules.isPending}
              >
                <Icon name="Undo2" className="h-4 w-4 mr-1" />
                Unpublish
              </Button>
            </div>
          )}
        </div>

        <ShiftSchedulesTable
          filters={filters}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEdit={handleEdit}
          onDelete={(schedule) => setDeleteTarget(schedule)}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />

        {/* Form Dialog */}
        <ShiftScheduleFormDialog
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingSchedule(null);
          }}
          schedule={editingSchedule}
        />

        {/* Delete Confirmation */}
        <Shad.AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <Shad.AlertDialogContent>
            <Shad.AlertDialogHeader>
              <Shad.AlertDialogTitle>Delete Schedule</Shad.AlertDialogTitle>
              <Shad.AlertDialogDescription>
                Are you sure you want to delete this schedule? This action
                cannot be undone.
              </Shad.AlertDialogDescription>
            </Shad.AlertDialogHeader>
            <Shad.AlertDialogFooter>
              <Shad.AlertDialogCancel disabled={deleteSchedule.isPending}>
                Cancel
              </Shad.AlertDialogCancel>
              <Shad.AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteSchedule.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteSchedule.isPending ? "Deleting..." : "Delete"}
              </Shad.AlertDialogAction>
            </Shad.AlertDialogFooter>
          </Shad.AlertDialogContent>
        </Shad.AlertDialog>
      </div>
    </div>
  );
};
