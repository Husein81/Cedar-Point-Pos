// localStorage key the API interceptor reads the bearer token from. Must
// match the key authStore writes to on login/logout.
export const AUTH_TOKEN_STORAGE_KEY = "pos-auth";

// `as const` preserves the literal type so it satisfies TanStack Router's
// typed `navigate({ to })`.
export const AUTH_ROUTE = "/auth" as const;
