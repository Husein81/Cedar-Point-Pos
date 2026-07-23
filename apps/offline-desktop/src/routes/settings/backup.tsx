import { createFileRoute } from "@tanstack/react-router";
import BackupPage from "@/components/settings/backup/BackupPage";

export const Route = createFileRoute("/settings/backup")({
  component: BackupPage,
});
