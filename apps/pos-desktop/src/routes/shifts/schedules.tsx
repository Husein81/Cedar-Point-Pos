import { createFileRoute } from "@tanstack/react-router";
import { ShiftSchedulesPage } from "@/components/shifts/schedules";

export const Route = createFileRoute("/shifts/schedules")({
  component: ShiftSchedulesPage,
});
