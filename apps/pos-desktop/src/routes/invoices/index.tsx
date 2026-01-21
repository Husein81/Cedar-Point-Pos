import { InvoicesPage } from "@/components/invoices";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/invoices/")({
  component: InvoicesPage,
});
