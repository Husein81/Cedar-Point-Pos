import { Badge, Button, Empty, Icon, Shad, cn } from "@repo/ui";
import type { ShiftScheduleWithRelations } from "@/dto/shift.dto";
import type { ShiftScheduleStatus } from "@repo/types";
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_VARIANTS,
  formatScheduleDate,
  formatScheduleTime,
} from "./scheduleUi";

type Props = {
  upcoming: ShiftScheduleWithRelations[];
  pastOther: ShiftScheduleWithRelations[];
  onOpenDetails: (schedule: ShiftScheduleWithRelations) => void;
};

type SectionProps = {
  title: string;
  iconName: string;
  schedules: ShiftScheduleWithRelations[];
  muted?: boolean;
  onOpenDetails: (schedule: ShiftScheduleWithRelations) => void;
  emptyDescription: string;
};

const ScheduleSection = ({
  title,
  iconName,
  schedules,
  muted,
  onOpenDetails,
  emptyDescription,
}: SectionProps) => (
  <div className="space-y-3">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <Icon name={iconName} className="h-5 w-5" />
      {title}
    </h2>

    {schedules.length === 0 ? (
      <Shad.Card className="p-5 border-dashed">
        <p className="text-sm text-muted-foreground">{emptyDescription}</p>
      </Shad.Card>
    ) : (
      <div className="grid gap-3">
        {schedules.map((schedule) => {
          const status = schedule.status as ShiftScheduleStatus;

          return (
            <Shad.Card
              key={schedule.id}
              className={cn("p-4", muted && "opacity-75")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      muted ? "bg-muted" : "bg-primary/10",
                    )}
                  >
                    <Icon
                      name="Clock"
                      className={cn(
                        "h-5 w-5",
                        muted ? "text-muted-foreground" : "text-primary",
                      )}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium">
                      {formatScheduleDate(String(schedule.startTime))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatScheduleTime(String(schedule.startTime))} -{" "}
                      {formatScheduleTime(String(schedule.endTime))}
                    </p>
                    {schedule.branch?.name ? (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Icon name="MapPin" className="h-3.5 w-3.5" />
                        {schedule.branch.name}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={SCHEDULE_STATUS_VARIANTS[status] ?? "secondary"}>
                    {SCHEDULE_STATUS_LABELS[status] ?? schedule.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenDetails(schedule)}
                  >
                    <Icon name="Eye" className="h-4 w-4 mr-1" />
                    View details
                  </Button>
                </div>
              </div>

              {schedule.notes ? (
                <p className="mt-2 text-sm text-muted-foreground pl-[52px]">
                  {schedule.notes}
                </p>
              ) : null}
            </Shad.Card>
          );
        })}
      </div>
    )}
  </div>
);

export const MySchedulesListView = ({
  upcoming,
  pastOther,
  onOpenDetails,
}: Props) => {
  if (upcoming.length === 0 && pastOther.length === 0) {
    return (
      <Shad.Card className="p-8">
        <Empty
          icon="CalendarX2"
          title="No schedules assigned"
          description="No schedules are available for your account yet."
        />
      </Shad.Card>
    );
  }

  return (
    <div className="space-y-6">
      <ScheduleSection
        title="Upcoming"
        iconName="CalendarCheck"
        schedules={upcoming}
        onOpenDetails={onOpenDetails}
        emptyDescription="No upcoming schedules."
      />

      <ScheduleSection
        title="Past & Other"
        iconName="CalendarDays"
        schedules={pastOther}
        muted
        onOpenDetails={onOpenDetails}
        emptyDescription="No past or other schedules."
      />
    </div>
  );
};
