// Tenant-wide VAT rate. Must stay in sync with the API's hardcoded 0.11 in
// OrdersService — see .claude/CLAUDE.md §9.
export const VAT_RATE = 0.11;
export const VAT_RATE_PERCENT_LABEL = `${(VAT_RATE * 100).toFixed(0)}%`;
