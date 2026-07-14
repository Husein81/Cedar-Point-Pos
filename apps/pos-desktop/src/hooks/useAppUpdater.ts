import { useCallback, useEffect, useState } from "react";

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface AppUpdaterApi {
  status: UpdateStatus;
  availableVersion: string | null;
  progress: UpdateProgress | null;
  errorMessage: string | null;
  /** False outside Electron (e.g. no preload bridge) — updates can't be checked. */
  isSupported: boolean;
  checkForUpdates: () => void;
  installUpdate: () => void;
}

/**
 * Renderer-side state machine for the main process's autoUpdater events
 * (see electron/main.ts setupAutoUpdater). One hook owns the whole
 * checking → available → downloading → downloaded lifecycle so the Update
 * settings page just renders `status`.
 */
export const useAppUpdater = (): AppUpdaterApi => {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [availableVersion, setAvailableVersion] = useState<string | null>(
    null,
  );
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updater = window.api?.updater;

  useEffect(() => {
    if (!updater) return;

    const unsubscribers = [
      updater.onChecking(() => {
        setStatus("checking");
        setErrorMessage(null);
      }),
      updater.onAvailable((version) => {
        setStatus("available");
        setAvailableVersion(version);
      }),
      updater.onNotAvailable(() => {
        setStatus("not-available");
      }),
      updater.onProgress((nextProgress) => {
        setStatus("downloading");
        setProgress(nextProgress);
      }),
      updater.onDownloaded(() => {
        setStatus("downloaded");
        setProgress(null);
      }),
      updater.onError((message) => {
        setStatus("error");
        setErrorMessage(message);
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [updater]);

  const checkForUpdates = useCallback(() => {
    setStatus("checking");
    setErrorMessage(null);
    void updater?.check();
  }, [updater]);

  const installUpdate = useCallback(() => {
    void updater?.install();
  }, [updater]);

  return {
    status,
    availableVersion,
    progress,
    errorMessage,
    isSupported: Boolean(updater),
    checkForUpdates,
    installUpdate,
  };
};
