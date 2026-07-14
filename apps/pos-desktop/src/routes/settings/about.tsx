import { AboutPage } from "@/components/settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/about")({
  component: AboutPage,
  staticData: {
    breadcrumb: "About",
  },
});
