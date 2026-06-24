import { createFileRoute } from "@tanstack/react-router";
import { StaffPage } from "@/components/staff/StaffPage";

export const Route = createFileRoute("/staff/")({
  component: StaffPage,
  staticData: {
    breadcrumb: "Staff",
  },
});
