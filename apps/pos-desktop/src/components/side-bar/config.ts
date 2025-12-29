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
  /* =========================
     SALES / POS
  ========================= */
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
        tooltip: "Overview & KPIs",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Orders",
        icon: "ShoppingCart",
        href: "/orders",
        tooltip: "Sales Orders",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Tables",
        icon: "Grid2x2",
        href: "/tables",
        tooltip: "Restaurant Tables",
        showFor: ["RESTAURANT"],
      },
      {
        label: "Kitchen (KDS)",
        icon: "Flame",
        href: "/kds",
        tooltip: "Kitchen Display System",
        showFor: ["RESTAURANT"],
      },
    ],
  },

  /* =========================
     PRODUCTS & INVENTORY
  ========================= */
  {
    label: "Inventory",
    items: [
      {
        label: "Products",
        icon: "Package",
        href: "/products",
        tooltip: "Products & Menu Items",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Categories",
        icon: "Tags",
        href: "/categories",
        tooltip: "Categories",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Stock",
        icon: "Warehouse",
        href: "/inventory",
        tooltip: "Branch Inventory",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Recipes",
        icon: "ChefHat",
        href: "/recipes",
        tooltip: "Ingredient Recipes",
        showFor: ["RESTAURANT"],
      },
      {
        label: "Transfers",
        icon: "ArrowLeftRight",
        href: "/transfers",
        tooltip: "Stock Transfers",
        showFor: ["RETAIL", "RESTAURANT"],
      },
    ],
  },

  /* =========================
     FINANCE
  ========================= */
  {
    label: "Finance",
    items: [
      {
        label: "Payments",
        icon: "CreditCard",
        href: "/payments",
        tooltip: "Payment Records",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Shifts",
        icon: "Clock",
        href: "/shifts",
        tooltip: "Cashier Shifts",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Refunds",
        icon: "Undo2",
        href: "/refunds",
        tooltip: "Refund History",
        showFor: ["RETAIL", "RESTAURANT"],
      },
    ],
  },

  /* =========================
     CUSTOMERS & CRM
  ========================= */
  {
    label: "Customers",
    items: [
      {
        label: "Customers",
        icon: "Users",
        href: "/customers",
        tooltip: "Customer Management",
        showFor: ["RETAIL", "RESTAURANT"],
      },
    ],
  },

  /* =========================
     MANAGEMENT
  ========================= */
  {
    label: "Management",
    items: [
      {
        label: "Reports",
        icon: "ChartBar",
        href: "/reports",
        tooltip: "Sales & Inventory Reports",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Taxes",
        icon: "Percent",
        href: "/taxes",
        tooltip: "Tax Configuration",
        showFor: ["RETAIL", "RESTAURANT"],
      },
      {
        label: "Settings",
        icon: "Settings",
        href: "/settings",
        tooltip: "System Settings",
        showFor: ["RETAIL", "RESTAURANT"],
      },
    ],
  },
];
