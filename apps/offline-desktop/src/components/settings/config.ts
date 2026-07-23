import { UserRole } from "@/shared/enums";

export type SettingsSection = {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  /** Roles allowed to see this section. Omit to allow all roles. */
  roles?: UserRole[];
};

export const settingsSections: SettingsSection[] = [
  {
    id: "business",
    label: "Business",
    description: "Business details, currency, tax and receipts",
    icon: "Building2",
    href: "/settings/business",
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Customize the app's appearance",
    icon: "Palette",
    href: "/settings/appearance",
  },
  {
    id: "colors",
    label: "Colors",
    description: "Manage colors for categories and products",
    icon: "Droplet",
    href: "/settings/colors",
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    id: "backup",
    label: "Backup & Restore",
    description: "Export or restore the local database",
    icon: "DatabaseBackup",
    href: "/settings/backup",
    roles: [UserRole.OWNER],
  },
  {
    id: "about",
    label: "About",
    description: "App version and system information",
    icon: "Info",
    href: "/settings/about",
  },
];
