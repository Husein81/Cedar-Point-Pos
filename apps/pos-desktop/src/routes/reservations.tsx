import { createFileRoute } from "@tanstack/react-router";
import { ReservationsPage } from "@/components/reservations";

export const Route = createFileRoute("/reservations")({
  component: ReservationsPage,
});
