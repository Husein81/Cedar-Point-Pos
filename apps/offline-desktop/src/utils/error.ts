import { IpcClientError } from "@/lib/ipc";

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof IpcClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function errorCode(error: unknown): string | null {
  return error instanceof IpcClientError ? error.code : null;
}
