import { UpdatePage } from "@/components/settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/update")({
  component: UpdatePage,
  staticData: {
    breadcrumb: "Updates",
  },
});
