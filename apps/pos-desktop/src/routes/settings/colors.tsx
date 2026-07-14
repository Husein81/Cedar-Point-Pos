import ColorsPage from "@/components/settings/colors/ColorsPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/colors")({
  component: ColorsPage,
  staticData: {
    breadcrumb: "Colors",
  },
});
