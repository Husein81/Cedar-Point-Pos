import { createFileRoute } from "@tanstack/react-router";
import BusinessPage from "@/components/settings/business/BusinessPage";

export const Route = createFileRoute("/settings/business")({
  component: BusinessPage,
});
