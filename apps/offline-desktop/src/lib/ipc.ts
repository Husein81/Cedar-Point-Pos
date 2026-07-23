// Typed IPC client — the renderer's single gateway to the main process
// (the offline analog of pos-desktop's apis/api.ts axios instance).
// Unwraps the IpcResult envelope: success returns data, failure throws IpcClientError.

import type {
  IpcChannel,
  IpcError,
  IpcInput,
  IpcOutput,
  IpcResult,
} from "@/shared/ipc-contract";

export class IpcClientError extends Error {
  readonly code: string;

  constructor(error: IpcError) {
    super(error.message);
    this.name = "IpcClientError";
    this.code = error.code;
  }
}

export async function invoke<C extends IpcChannel>(
  channel: C,
  input: IpcInput<C>,
): Promise<IpcOutput<C>> {
  if (!window.ipc) {
    throw new IpcClientError({
      message: "IPC bridge unavailable — not running inside Electron",
      code: "NO_BRIDGE",
    });
  }

  const result = (await window.ipc.invoke(channel, input)) as IpcResult<
    IpcOutput<C>
  >;

  if (!result.ok) {
    throw new IpcClientError(result.error);
  }

  return result.data;
}
