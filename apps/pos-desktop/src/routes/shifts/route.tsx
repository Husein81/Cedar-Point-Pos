import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/shifts")({
  component: ShiftsLayout,
});

function ShiftsLayout() {
  return <Outlet />;
}
