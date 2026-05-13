import type { AxiosError } from "axios";

/**
 * Extracts a human-readable error message from an unknown error object.
 * Handles Axios errors, standard Error objects, and strings.
 */
export function extractErrorMessage(error: unknown, fallback: string = "Operation failed"): string {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    // Axios errors have a response property with data
    const axiosError = error as AxiosError<{ message?: any }>;
    const data = axiosError.response?.data;

    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message[0];
      }
      if (typeof data.message === "string") {
        return data.message;
      }
    }

    return error.message || fallback;
  }

  // If it's an object with a message property
  if (typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
    return (error as any).message;
  }

  return fallback;
}
