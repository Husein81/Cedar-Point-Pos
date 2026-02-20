import { createFileRoute } from "@tanstack/react-router";
import { OffersPage } from "@/components/offers/OffersPage";

export const Route = createFileRoute("/offers/")({
  component: OffersPage,
});
