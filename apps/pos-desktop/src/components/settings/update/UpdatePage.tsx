import TitleBar from "@/components/title-bar";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useAppUpdater } from "@/hooks/useAppUpdater";
import { Badge, Button, Icon, Progress, Shad } from "@repo/ui";

const formatBytes = (bytes: number): string =>
  `${(bytes / 1_048_576).toFixed(1)} MB`;

export default function UpdatePage() {
  const appInfo = useAppInfo();
  const {
    status,
    availableVersion,
    progress,
    errorMessage,
    isSupported,
    checkForUpdates,
    installUpdate,
  } = useAppUpdater();

  return (
    <div className="space-y-6">
      <TitleBar
        title="Updates"
        subtitle="Keep Cedar Point POS up to date with the latest features and fixes"
      />

      <Shad.Card>
        <Shad.CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-background p-2">
                <Icon name="Download" className="size-5" />
              </div>
              <div>
                <Shad.CardTitle>Software Update</Shad.CardTitle>
                <Shad.CardDescription>
                  Updates download automatically in the background
                </Shad.CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Current version
              </span>
              <Badge variant="outline" className="font-mono">
                {appInfo?.version ?? "—"}
              </Badge>
            </div>
          </div>
        </Shad.CardHeader>

        <Shad.CardContent className="space-y-4 pt-6">
          {!isSupported ? (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
              <Icon
                name="Info"
                className="size-5 shrink-0 text-muted-foreground"
              />
              <p className="text-sm text-muted-foreground">
                Updates are only available in the installed desktop app.
              </p>
            </div>
          ) : appInfo && !appInfo.isPackaged ? (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
              <Icon
                name="Info"
                className="size-5 shrink-0 text-muted-foreground"
              />
              <p className="text-sm text-muted-foreground">
                Running in development mode — auto-update is disabled.
              </p>
            </div>
          ) : (
            <>
              {status === "idle" && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Check now to see if a newer version is available.
                  </p>
                  <Button onClick={checkForUpdates} iconName="RefreshCw">
                    Check for Updates
                  </Button>
                </div>
              )}

              {status === "checking" && (
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Icon
                    name="LoaderCircle"
                    className="size-5 animate-spin text-primary"
                  />
                  <p className="text-sm font-medium">Checking for updates...</p>
                </div>
              )}

              {status === "not-available" && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Icon
                      name="CircleCheck"
                      className="size-5 text-emerald-600 dark:text-emerald-400"
                    />
                    <p className="text-sm font-medium">
                      You're on the latest version.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={checkForUpdates}
                    iconName="RefreshCw"
                  >
                    Check Again
                  </Button>
                </div>
              )}

              {status === "available" && (
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Icon
                    name="LoaderCircle"
                    className="size-5 animate-spin text-primary"
                  />
                  <p className="text-sm font-medium">
                    Version {availableVersion} is available — downloading...
                  </p>
                </div>
              )}

              {status === "downloading" && (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Downloading update...</p>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress?.percent ?? 0)}%
                    </span>
                  </div>
                  <Progress value={progress?.percent ?? 0} />
                  {progress && (
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(progress.transferred)} of{" "}
                      {formatBytes(progress.total)}
                    </p>
                  )}
                </div>
              )}

              {status === "downloaded" && (
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <Icon name="CircleCheck" className="size-5 text-primary" />
                    <p className="text-sm font-medium">
                      Update ready — restart to install.
                    </p>
                  </div>
                  <Button onClick={installUpdate} iconName="RotateCw">
                    Restart & Install
                  </Button>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-3">
                    <Icon
                      name="TriangleAlert"
                      className="size-5 text-destructive"
                    />
                    <p className="text-sm font-medium">
                      {errorMessage || "Failed to check for updates."}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={checkForUpdates}
                    iconName="RefreshCw"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </>
          )}
        </Shad.CardContent>
      </Shad.Card>
    </div>
  );
}
