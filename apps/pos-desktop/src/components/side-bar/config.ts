import type { BusinessType } from "@repo/types";

export type SidebarItem = {
  label: string;
  icon: string;
  tooltip?: string;
  href: string;
  showFor: BusinessType[];
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

export const sidebarSections: SidebarSection[] = [
  {
    label: "POS",
    items: [
      {
        label: "Home",
        icon: "House",
        href: "/",
        tooltip: "Home",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Dashboard",
        icon: "LayoutDashboard",
        href: "/dashboard",
        tooltip: "Dashboard",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Orders",
        icon: "Receipt",
        href: "/orders",
        tooltip: "Orders",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Tables",
        icon: "Grid2x2",
        href: "/tables",
        tooltip: "Tables",
        showFor: ["RESTAURANT"],
      },
    ],
  },
  {
    label: "Business Partners",
    items: [
      {
        label: "Suppliers",
        icon: "Truck",
        href: "/suppliers",
        tooltip: "Suppliers",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Customers",
        icon: "User",
        href: "/customers",
        tooltip: "Customers",
        showFor: ["RETAIL", "RESTAURANT"],
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Categories",
        icon: "Tags",
        href: "/categories",
        tooltip: "Categories",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Products",
        icon: "Package",
        href: "/products",
        tooltip: "Products",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Stock",
        icon: "Warehouse",
        href: "/stock",
        tooltip: "Stock",
        showFor: ["RETAIL"],
      },
      {
        label: "Recipes",
        icon: "ChefHat",
        href: "/recipes",
        tooltip: "Recipes",
        showFor: ["RESTAURANT"],
      },
      {
        label: "Transfers",
        icon: "ArrowLeftRight",
        href: "/transfers",
        tooltip: "Transfers",
        showFor: ["RETAIL", "RESTAURANT"],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Invoices",
        icon: "FileText",
        href: "/invoices",
        tooltip: "Invoices",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Payments",
        icon: "CreditCard",
        href: "/payments",
        tooltip: "Payments",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Refunds",
        icon: "RotateCcw",
        href: "/refunds",
        tooltip: "Refund Station",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Reports",
        icon: "ChartBar",
        href: "/reports",
        tooltip: "Reports",
        showFor: ["RETAIL", "RESTAURANT"],
      },
    ],
  },
];
