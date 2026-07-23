export const formatMoney = (value: number, symbol = "$"): string =>
  `${symbol}${value.toFixed(2)}`;

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
