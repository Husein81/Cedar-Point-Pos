import TitleBar from "@/components/title-bar";
import { useAppInfo } from "@/hooks/useAppInfo";
import { Button, Icon, Shad } from "@repo/ui";
import { Link } from "@tanstack/react-router";
import logo from "/assets/logo.png";

const SUPPORT_EMAIL = "support@cedarcore.io";
const REPOSITORY_URL = "https://github.com/Husein81/Cedar-Point-Pos";

type InfoRowProps = {
  label: string;
  value: string;
};

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className="flex items-center justify-between border-b py-2.5 text-sm last:border-b-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono font-medium">{value}</span>
  </div>
);

export default function AboutPage() {
  const appInfo = useAppInfo();

  return (
    <div className="space-y-6">
      <TitleBar title="About" subtitle="App version and system information" />

      <Shad.Card>
        <Shad.CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <img
            src={logo}
            alt="Cedar Point"
            className="size-16 invert dark:invert-0"
          />
          <div>
            <h2 className="text-xl font-semibold">
              Cedar <span className="text-primary">Point</span> POS
            </h2>
            <p className="text-sm text-muted-foreground">
              Version {appInfo?.version ?? "—"}
            </p>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            An offline-first POS system for retail and restaurants.
          </p>
          <Link to="/settings/update">
            <Button variant="outline" iconName="DownloadCloud">
              Check for Updates
            </Button>
          </Link>
        </Shad.CardContent>
      </Shad.Card>

      <Shad.Card>
        <Shad.CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-background p-2">
              <Icon name="Cpu" className="size-5" />
            </div>
            <div>
              <Shad.CardTitle>System Information</Shad.CardTitle>
              <Shad.CardDescription>
                Useful when contacting support
              </Shad.CardDescription>
            </div>
          </div>
        </Shad.CardHeader>
        <Shad.CardContent className="pt-2">
          <InfoRow label="App Version" value={appInfo?.version ?? "—"} />
          <InfoRow label="Chromium" value={appInfo?.chromeVersion ?? "—"} />
          <InfoRow
            label="Platform"
            value={appInfo ? `${appInfo.platform} (${appInfo.arch})` : "—"}
          />
        </Shad.CardContent>
      </Shad.Card>

      <Shad.Card>
        <Shad.CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-background p-2">
              <Icon name="LifeBuoy" className="size-5" />
            </div>
            <div>
              <Shad.CardTitle>Support</Shad.CardTitle>
              <Shad.CardDescription>Cedar Core</Shad.CardDescription>
            </div>
          </div>
        </Shad.CardHeader>
        <Shad.CardContent className="pt-2">
          <InfoRow label="Support Email" value={SUPPORT_EMAIL} />
          <InfoRow label="Repository" value={REPOSITORY_URL} />
        </Shad.CardContent>
      </Shad.Card>
    </div>
  );
}
