import { UserRole } from "@/shared/enums";

export type SidebarItem = {
  label: string;
  icon: string;
  tooltip?: string;
  href: string;
  roles?: UserRole[];
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

const ALL_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.CASHIER,
];
const MANAGEMENT: UserRole[] = [UserRole.OWNER, UserRole.MANAGER];

export const sidebarSections: SidebarSection[] = [
  {
    label: "POS",
    items: [
      {
        label: "Dashboard",
        icon: "LayoutDashboard",
        href: "/dashboard",
        tooltip: "Dashboard",
        roles: MANAGEMENT,
      },
      {
        label: "Sales",
        icon: "ShoppingCart",
        href: "/",
        tooltip: "Sales",
        roles: ALL_ROLES,
      },
      {
        label: "Orders",
        icon: "Receipt",
        href: "/orders",
        tooltip: "Orders",
        roles: ALL_ROLES,
      },
      {
        label: "Cash Register",
        icon: "Banknote",
        href: "/register",
        tooltip: "Cash Register",
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        label: "Categories",
        icon: "Tags",
        href: "/categories",
        tooltip: "Categories",
        roles: MANAGEMENT,
      },
      {
        label: "Products",
        icon: "Package",
        href: "/products",
        tooltip: "Products",
        roles: MANAGEMENT,
      },
      {
        label: "Inventory",
        icon: "Warehouse",
        href: "/inventory",
        tooltip: "Inventory",
        roles: MANAGEMENT,
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        label: "Customers",
        icon: "User",
        href: "/customers",
        tooltip: "Customers",
        roles: ALL_ROLES,
      },
      {
        label: "Employees",
        icon: "Users",
        href: "/employees",
        tooltip: "Employees",
        roles: [UserRole.OWNER],
      },
    ],
  },
];
