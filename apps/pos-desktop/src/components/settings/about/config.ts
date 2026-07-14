const SUPPORT_EMAIL = "contact@cedarpoint.software";

type InfoRowProps = {
  label: string;
  value: string;
  href?: string;
};

export const versionInfo = (appInfo: AppInfo | null): InfoRowProps[] => [
  {
    label: "App Version",
    value: appInfo?.version ?? "—",
  },
  {
    label: "Chromium",
    value: appInfo?.chromeVersion ?? "—",
  },
  {
    label: "OS Platform",
    value: appInfo ? `${appInfo.platform} (${appInfo.arch})` : "—",
  },
];

export const supports: InfoRowProps[] = [
  {
    label: "Support Email",
    value: SUPPORT_EMAIL,
  },
  {
    label: "Website",
    value: "cedarpoint.software",
    href: "https://cedarpoint.software",
  },
];
