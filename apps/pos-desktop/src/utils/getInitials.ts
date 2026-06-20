/** First letters of the first two words, uppercased (e.g. "John Doe" → "JD"). */
export const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
