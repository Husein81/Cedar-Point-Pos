import { TablesPage } from "@/components/tables";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tables")({
  component: TablesPage,
});
