import { useEffect, useState } from "react";

export const useAppInfo = (): AppInfo | null => {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let mounted = true;

    window.api?.app
      ?.getInfo()
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
