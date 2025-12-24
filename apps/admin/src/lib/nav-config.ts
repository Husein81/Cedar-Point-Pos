import {
  LayoutDashboard,
  Building2,
  Network,
  Users,
  Smartphone,
  CreditCard,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  permissionKey: string;
};

/**
 * Navigation configuration for System Admin sidebar
 * Each item requires a permission key for access control
 */
export const adminNavItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
    permissionKey: "admin:dashboard:read",
  },
  {
    label: "Tenants",
    icon: Building2,
    href: "/admin/tenants",
    permissionKey: "admin:tenants:read",
  },
  {
    label: "Branches",
    icon: Network,
    href: "/admin/branches",
    permissionKey: "admin:branches:read",
  },
  {
    label: "Users",
    icon: Users,
    href: "/admin/users",
    permissionKey: "admin:users:read",
  },
  {
    label: "Devices",
    icon: Smartphone,
    href: "/admin/devices",
    permissionKey: "admin:devices:read",
  },
  {
    label: "Subscriptions",
    icon: CreditCard,
    href: "/admin/subscriptions",
    permissionKey: "admin:subscriptions:read",
  },
  {
    label: "Logs",
    icon: FileText,
    href: "/admin/logs",
    permissionKey: "admin:logs:read",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/admin/settings",
    permissionKey: "admin:settings:read",
  },
];

