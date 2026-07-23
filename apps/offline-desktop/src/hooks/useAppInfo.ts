import { useEffect, useState } from "react";

type AppInfo = {
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  isPackaged: boolean;
};

export const useAppInfo = (): AppInfo | null => {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let mounted = true;

    window.electron
      ?.getAppInfo()
      .then((result) => {
        if (mounted) setInfo(result);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return info;
};
