function slugify(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomBase36(len: number) {
  // e.g. "7K2D9Q"
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 36)
      .toString(36)
      .toUpperCase()
  ).join("");
}

export function generateSku(name: string) {
  const base = slugify(name).slice(0, 12) || "ITEM";
  return `${base}-${randomBase36(6)}`; // e.g. PERFUME-ROYAL-7K2D9Q
}

export function generateEan13() {
  // Simple EAN-13 generator (random 12 digits + checksum)
  const digits = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 10)
  );
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const checksum = (10 - (sum % 10)) % 10;
  return [...digits, checksum].join("");
}
