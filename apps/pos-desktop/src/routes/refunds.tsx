import { createFileRoute } from "@tanstack/react-router";
import { RefundPage } from "@/components/refunds/RefundPage";

export const Route = createFileRoute("/refunds")({
  component: RefundPage,
});
