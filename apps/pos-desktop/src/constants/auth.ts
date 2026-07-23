// localStorage key the API interceptor reads the bearer token from. Must
// match the key authStore writes to on login/logout.
export const AUTH_TOKEN_STORAGE_KEY = "pos-auth";

// localStorage key for the refresh token used to silently renew an expired
// access token (see lib/api.ts's 401 interceptor). Only set for username/
// password sessions — POS PIN sessions issue no refresh token by design.
export const AUTH_REFRESH_TOKEN_STORAGE_KEY = "pos-auth-refresh";

// `as const` preserves the literal type so it satisfies TanStack Router's
// typed `navigate({ to })`.
export const AUTH_ROUTE = "/auth" as const;
