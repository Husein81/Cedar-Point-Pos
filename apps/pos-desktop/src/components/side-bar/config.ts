export const sidebarSections = [
  {
    label: "POS",
    items: [
      {
        label: "Home",
        icon: "House",
        tooltip: "Home",
        href: "/",
      },
      {
        label: "Dashboard",
        icon: "LayoutDashboard",
        href: "/dashboard",
        tooltip: "Dashboard",
      },
      {
        label: "Orders",
        icon: "ShoppingCart",
        href: "/orders",
        tooltip: "Orders",
      },
      {
        label: "Products",
        href: "/products",
        icon: "Package",
        tooltip: "Products",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Stock",
        icon: "Warehouse",
        href: "/stock",
        tooltip: "Stock",
      },
      {
        label: "Transfers",
        href: "/transfers",
        icon: "ArrowLeftRight",
        tooltip: "Transfers",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Payments",
        icon: "CreditCard",
        href: "/payments",
        tooltip: "Payments",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: "ChartBar",
        tooltip: "Reports",
      },
    ],
  },
];
