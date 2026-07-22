import {
  SCHEDULE_STATUS_BADGE,
  SCHEDULE_STATUS_LABELS,
} from "@/constants/shiftSchedule";
import type { ShiftScheduleStatus } from "@repo/types";
import { Badge, cn } from "@repo/ui";

type Props = {
  status: ShiftScheduleStatus;
  className?: string;
};

export const ShiftScheduleStatusBadge = ({ status, className }: Props) => {
  const { variant, className: statusClassName } = SCHEDULE_STATUS_BADGE[status];
  return (
    <Badge variant={variant} className={cn(statusClassName, className)}>
      {SCHEDULE_STATUS_LABELS[status]}
    </Badge>
  );
};
