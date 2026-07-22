import {
  DELETABLE_SCHEDULE_STATUSES,
  EDITABLE_SCHEDULE_STATUSES,
} from "@/constants/shiftSchedule";
import {
  useCancelShiftSchedule,
  useDeleteShiftSchedule,
  usePublishShiftSchedules,
  useUnpublishShiftSchedules,
} from "@/hooks/useShiftSchedule";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import type { ShiftScheduleView } from "@/dto/shiftSchedule.dto";
import { ShiftScheduleStatus, UserRole } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import {
  formatDaysOfWeek,
  formatScheduleDate,
} from "@/utils/shiftScheduleTime";
import { ShiftScheduleForm } from "./ShiftScheduleForm";

const MANAGER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];

export const ShiftScheduleActions = ({
  schedule,
}: {
  schedule: ShiftScheduleView;
}) => {
  const openModal = useModalStore((state) => state.openModal);
  const actorRole = useAuthStore((state) => state.user?.role);

  const publish = usePublishShiftSchedules();
  const unpublish = useUnpublishShiftSchedules();
  const cancel = useCancelShiftSchedule();
  const remove = useDeleteShiftSchedule();

  const canManage = !!actorRole && MANAGER_ROLES.includes(actorRole);
  if (!canManage) return null;

  const { status } = schedule;
  const isEditable = EDITABLE_SCHEDULE_STATUSES.includes(status);
  const isDeletable = DELETABLE_SCHEDULE_STATUSES.includes(status);

  // A STARTED schedule is owned by its live runtime shift — no roster actions.
  if (status === ShiftScheduleStatus.STARTED) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const handleEdit = () =>
    openModal("Edit Schedule", <ShiftScheduleForm schedule={schedule} />);

  const handleCancel = () => {
    const when = schedule.isRecurring
      ? `weekly shift (${formatDaysOfWeek(schedule.daysOfWeek)})`
      : schedule.date
        ? `shift on ${formatScheduleDate(schedule.date)}`
        : "shift";
    if (window.confirm(`Cancel ${schedule.user.name}'s ${when}?`)) {
      cancel.mutate(schedule.id);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Delete this schedule permanently?")) {
      remove.mutate(schedule.id);
    }
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Icon name="Ellipsis" className="size-4" />
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="end">
        {isEditable && (
          <Shad.DropdownMenuItem onClick={handleEdit}>
            <Icon name="SquarePen" className="h-4 w-4" />
            Edit
          </Shad.DropdownMenuItem>
        )}

        {status === ShiftScheduleStatus.DRAFT && (
          <Shad.DropdownMenuItem
            onClick={() => publish.mutate([schedule.id])}
            disabled={publish.isPending}
          >
            <Icon name="Send" className="h-4 w-4" />
            Publish
          </Shad.DropdownMenuItem>
        )}

        {status === ShiftScheduleStatus.PUBLISHED && (
          <Shad.DropdownMenuItem
            onClick={() => unpublish.mutate([schedule.id])}
            disabled={unpublish.isPending}
          >
            <Icon name="Undo2" className="h-4 w-4" />
            Unpublish
          </Shad.DropdownMenuItem>
        )}

        {isEditable && (
          <Shad.DropdownMenuItem
            onClick={handleCancel}
            disabled={cancel.isPending}
            variant="destructive"
          >
            <Icon name="Ban" className="h-4 w-4" />
            Cancel
          </Shad.DropdownMenuItem>
        )}

        {isDeletable && (
          <Shad.DropdownMenuItem
            onClick={handleDelete}
            disabled={remove.isPending}
            variant="destructive"
          >
            <Icon name="Trash2" className="h-4 w-4" />
            Delete
          </Shad.DropdownMenuItem>
        )}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
