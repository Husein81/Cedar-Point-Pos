export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "N/A";
  return new Intl.NumberFormat("en-LB", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};
