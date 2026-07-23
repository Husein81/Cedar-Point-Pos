import { ipcMain } from "electron";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import type {
  IpcChannel,
  IpcInput,
  IpcOutput,
  IpcResult,
} from "../../shared/ipc-contract";
import { AppError } from "./errors";

// Central IPC registration. Every handler:
//  1. validates its input with the channel's Zod schema (or passes void),
//  2. runs the service function,
//  3. serializes success/failure into an IpcResult envelope —
//     raw exceptions never cross the boundary.

type HandlerDef<C extends IpcChannel> = {
  schema: IpcInput<C> extends void ? null : ZodType<IpcInput<C>>;
  handle: (input: IpcInput<C>) => IpcOutput<C> | Promise<IpcOutput<C>>;
};

export function registerHandler<C extends IpcChannel>(
  channel: C,
  def: HandlerDef<C>,
) {
  ipcMain.handle(channel, async (_event, rawInput: unknown) => {
    try {
      const input = def.schema
        ? (def.schema.parse(rawInput) as IpcInput<C>)
        : (undefined as IpcInput<C>);

      const data = await def.handle(input);

      return { ok: true, data } satisfies IpcResult<IpcOutput<C>>;
    } catch (error) {
      return {
        ok: false,
        error: toIpcError(error),
      } satisfies IpcResult<never>;
    }
  });
}

function toIpcError(error: unknown): { message: string; code: string } {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return {
      message: first ? first.message : "Invalid input",
      code: "VALIDATION_ERROR",
    };
  }

  if (error instanceof AppError) {
    return { message: error.message, code: error.code };
  }

  if (error instanceof Error) {
    // SQLite constraint errors surface as generic Errors — keep the message
    // user-safe but log the original for diagnosis.
    console.error("[ipc] unhandled error:", error);
    return { message: "Something went wrong", code: "INTERNAL_ERROR" };
  }

  console.error("[ipc] unknown error:", error);
  return { message: "Something went wrong", code: "INTERNAL_ERROR" };
}
