import { ThemesPage } from "@/components/settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/themes")({
  component: ThemesPage,
  staticData: {
    breadcrumb: "Themes",
  },
});
