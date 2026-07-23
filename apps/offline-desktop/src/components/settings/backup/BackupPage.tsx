import TitleBar from "@/components/title-bar";
import { useExportBackup, useRestoreBackup } from "@/hooks/useSettings";
import { Button, Icon, Shad } from "@repo/ui";

export default function BackupPage() {
  const exportBackup = useExportBackup();
  const restoreBackup = useRestoreBackup();

  return (
    <div className="space-y-8 p-4">
      <TitleBar
        title="Backup & Restore"
        subtitle="Export or restore the local database"
      />

      <Shad.Card className="rounded-md">
        <Shad.CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-background p-2">
              <Icon name="DatabaseBackup" className="size-5" />
            </div>
            <div>
              <Shad.CardTitle>Backup &amp; Restore</Shad.CardTitle>
              <Shad.CardDescription>
                Export the full database to a file, or restore from a backup
              </Shad.CardDescription>
            </div>
          </div>
        </Shad.CardHeader>
        <Shad.CardContent className="flex gap-3 pt-6">
          <Button
            variant="outline"
            iconName="Download"
            disabled={exportBackup.isPending}
            onClick={() => exportBackup.mutate()}
          >
            Export Backup
          </Button>
          <Button
            variant="outline"
            iconName="Upload"
            disabled={restoreBackup.isPending}
            onClick={() => restoreBackup.mutate()}
          >
            Restore Backup
          </Button>
        </Shad.CardContent>
      </Shad.Card>
    </div>
  );
}
