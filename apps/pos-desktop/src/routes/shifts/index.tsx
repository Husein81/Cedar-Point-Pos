import { createFileRoute } from "@tanstack/react-router";
import { ShiftsPage } from "@/components/shifts/ShiftsPage";

export const Route = createFileRoute("/shifts/")({
  component: ShiftsPage,
});
