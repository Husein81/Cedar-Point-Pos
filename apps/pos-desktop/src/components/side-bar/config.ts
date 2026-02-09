import type { BusinessType, UserRole } from "@repo/types";

export type SidebarItem = {
  label: string;
  icon: string;
  tooltip?: string;
  href: string;
  showFor: BusinessType[];
  roles?: UserRole[];
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
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Dashboard",
        icon: "LayoutDashboard",
        href: "/dashboard",
        tooltip: "Dashboard",
        showFor: ["RETAIL", "RESTAURANT"],
        roles: ["ADMIN", "MANAGER"],
      },
      {
        label: "Orders",
        icon: "Receipt",
        href: "/orders",
        tooltip: "Orders",
        showFor: ["RETAIL", "RESTAURANT"],
        roles: ["ADMIN", "MANAGER", "CASHIER"],
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
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Customers",
        icon: "User",
        href: "/customers",
        tooltip: "Customers",
        showFor: ["RETAIL", "RESTAURANT"],
        roles: ["ADMIN", "MANAGER", "CASHIER"],
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
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Products",
        icon: "Package",
        href: "/products",
        tooltip: "Products",
        showFor: ["RETAIL", "RESTAURANT"],
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Stock",
        icon: "Warehouse",
        href: "/stock",
        tooltip: "Stock",
        showFor: ["RETAIL"],
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Modifiers",
        icon: "Package",
        href: "/modifiers",
        tooltip: "Manage Modifiers",
        showFor: ["RESTAURANT"],
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Kitchen",
        icon: "ChefHat",
        href: "/kitchen",
        tooltip: "Kitchen Orders",
        showFor: ["RESTAURANT"],
        roles: ["ADMIN", "MANAGER", "KITCHEN"],
      },
      {
        label: "Recipes",
        icon: "CookingPot",
        href: "/recipes",
        tooltip: "Recipes",
        showFor: ["RESTAURANT"],
        roles: ["ADMIN", "MANAGER"],
      },
      {
        label: "Transfers",
        icon: "ArrowLeftRight",
        href: "/transfers",
        tooltip: "Transfers",
        showFor: ["RETAIL", "RESTAURANT"],
        roles: ["ADMIN", "MANAGER", "CASHIER"],
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
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Payments",
        icon: "CreditCard",
        href: "/payments",
        tooltip: "Payments",
        showFor: ["RETAIL", "RESTAURANT"],
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Refunds",
        icon: "RotateCcw",
        href: "/refunds",
        tooltip: "Refund Station",
        showFor: ["RETAIL", "RESTAURANT"],
        roles: ["ADMIN", "MANAGER", "CASHIER"],
      },
      {
        label: "Reports",
        icon: "ChartBar",
        href: "/reports",
        tooltip: "Reports",
        showFor: ["RETAIL", "RESTAURANT"],
        roles: ["ADMIN", "MANAGER"],
      },
    ],
  },
];
