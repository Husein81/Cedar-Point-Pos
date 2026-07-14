import TitleBar from "@/components/title-bar";
import { useAppInfo } from "@/hooks/useAppInfo";
import { Button, Icon, Shad } from "@repo/ui";
import { Link } from "@tanstack/react-router";
import logo from "/assets/logo.png";
import { supports, versionInfo } from "./config";

type InfoRowProps = {
  label: string;
  value: string;
  href?: string;
};

const InfoRow = ({ label, value, href }: InfoRowProps) => (
  <div className="flex items-center justify-between border-b py-2.5 text-sm last:border-b-0">
    <span className="text-muted-foreground">{label}</span>
    {href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono font-medium text-primary hover:underline"
      >
        {value}
        <Icon name="ArrowUpRight" className="ml-1 inline size-3" />
      </a>
    ) : (
      <span className="font-mono font-medium">{value}</span>
    )}
  </div>
);

export default function AboutPage() {
  const appInfo = useAppInfo();

  return (
    <div className="space-y-6">
      <TitleBar title="About" subtitle="App version and system information" />

      <div>
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
            <Button variant="outline" iconName="Download">
              Check for Updates
            </Button>
          </Link>
        </Shad.CardContent>
      </div>

      <div>
        <Shad.CardContent className="pt-2">
          {versionInfo(appInfo).map((info) => (
            <InfoRow key={info.label} label={info.label} value={info.value} />
          ))}
        </Shad.CardContent>
      </div>

      <div>
        <Shad.CardContent className="pt-2">
          {supports.map((support) => (
            <InfoRow
              key={support.label}
              label={support.label}
              value={support.value}
              href={support.href}
            />
          ))}
        </Shad.CardContent>
      </div>
    </div>
  );
}
