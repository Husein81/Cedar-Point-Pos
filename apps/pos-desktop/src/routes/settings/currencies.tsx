import { CurrenciesPage } from "@/components/settings/currencies";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/currencies")({
  component: CurrenciesPage,
  staticData: {
    breadcrumb: "Currencies",
  },
});
