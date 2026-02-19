import { DateRangePreset } from "@/types/reports";

export const REPORT_CARDS = [
  {
    path: "/reports/sales",
    title: "Sales",
    description: "Sales performance & trends",
    icon: "FileText",
  },
  {
    path: "/reports/debts",
    title: "Debts",
    description: "Outstanding customer balances",
    icon: "CircleAlert",
  },
  {
    path: "/reports/payments",
    title: "Payments",
    description: "Payment methods & history",
    icon: "CreditCard",
  },
  {
    path: "/reports/inventory",
    title: "Inventory",
    description: "Stock levels & movements",
    icon: "Package",
  },
  {
    path: "/reports/products",
    title: "Products",
    description: "Top & low performing products",
    icon: "TrendingUp",
  },
  {
    path: "/reports/customers",
    title: "Customers",
    description: "Customer activity & loyalty",
    icon: "Users",
  },
  {
    path: "/reports/financials",
    title: "Financials",
    description: "Profit, taxes & margins",
    icon: "ChartLine",
  },
  {
    path: "/reports/loyalty",
    title: "Loyalty",
    description: "Points activity & transactions",
    icon: "Award",
  },
] as const;

export const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

export const ORDER_TYPES = [
  { value: "all", label: "All Order Types" },
  { value: "DINE_IN", label: "Dine In" },
  { value: "TAKEAWAY", label: "Takeaway" },
  { value: "DELIVERY", label: "Delivery" },
];

export const PAYMENT_METHODS = [
  { value: "all", label: "All Payments" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "MIXED", label: "Mixed" },
];
