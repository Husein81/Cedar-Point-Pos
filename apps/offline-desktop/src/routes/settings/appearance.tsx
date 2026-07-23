import { createFileRoute } from "@tanstack/react-router";
import AppearancePage from "@/components/settings/appearance/AppearancePage";

export const Route = createFileRoute("/settings/appearance")({
  component: AppearancePage,
});
