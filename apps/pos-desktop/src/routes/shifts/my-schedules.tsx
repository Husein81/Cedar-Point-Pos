import { createFileRoute } from "@tanstack/react-router";
import { MyShiftSchedulesPanel } from "@/components/shifts/schedules";

export const Route = createFileRoute("/shifts/my-schedules")({
  component: MyShiftSchedulesPanel,
});
