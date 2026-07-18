import { LoyaltyPage } from "@/components/settings/loyalty";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/loyalty")({
  component: LoyaltyPage,
  staticData: {
    breadcrumb: "Loyalty",
  },
});
