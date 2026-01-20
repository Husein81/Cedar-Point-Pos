import { createFileRoute } from "@tanstack/react-router";
import { ModifiersPage } from "@/components/modifiers/ModifiersPage";

export const Route = createFileRoute("/modifiers/")({
  component: ModifiersPage,
});
