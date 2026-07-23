import { createFileRoute } from "@tanstack/react-router";
import ColorsPage from "@/components/settings/colors/ColorsPage";

export const Route = createFileRoute("/settings/colors")({
  component: ColorsPage,
});
