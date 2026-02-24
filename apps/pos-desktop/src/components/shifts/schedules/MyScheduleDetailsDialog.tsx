import { Badge, Icon, Shad } from "@repo/ui";
import type { ShiftScheduleWithRelations } from "@/dto/shift.dto";
import type { ShiftScheduleStatus } from "@repo/types";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_VARIANTS,
  formatScheduleDate,
  formatScheduleTime,
} from "./scheduleUi";

type Props = {
  open: boolean;
  schedule: ShiftScheduleWithRelations | null;
  onClose: () => void;
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-right">{value}</p>
  </div>
);

export const MyScheduleDetailsDialog = ({ open, schedule, onClose }: Props) => {
  const status = schedule?.status as ShiftScheduleStatus | undefined;

  return (
    <Shad.Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Shad.DialogContent className="max-w-md">
        <Shad.DialogHeader>
          <Shad.DialogTitle>
            <div className="flex items-center gap-2">
              <Icon name="CalendarDays" className="h-5 w-5" />
              Schedule Details
            </div>
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            View the selected shift schedule information.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        {!schedule ? null : (
          <div className="space-y-4 py-1">
            <Shad.Card className="p-4">
              <div className="space-y-3">
                <InfoRow
                  label="Date"
                  value={formatScheduleDate(String(schedule.startTime))}
                />
                <InfoRow
                  label="Time"
                  value={`${formatScheduleTime(String(schedule.startTime))} - ${formatScheduleTime(String(schedule.endTime))}`}
                />
                <InfoRow label="Branch" value={schedule.branch?.name ?? "-"} />
                <InfoRow label="Device" value={schedule.device?.name ?? "-"} />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={SCHEDULE_STATUS_VARIANTS[status ?? "DRAFT"]}>
                    {SCHEDULE_STATUS_LABELS[status ?? "DRAFT"]}
                  </Badge>
                </div>
              </div>
            </Shad.Card>

            {schedule.notes ? (
              <Shad.Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{schedule.notes}</p>
              </Shad.Card>
            ) : null}
          </div>
        )}
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
