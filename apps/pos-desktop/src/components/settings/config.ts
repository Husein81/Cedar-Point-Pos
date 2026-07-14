import type { BusinessType } from "@repo/types";

export type SettingsSection = {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  showFor: BusinessType[];
};

export const settingsSections: SettingsSection[] = [
  {
    id: "profile",
    label: "Profile",
    description: "View and manage your personal account details",
    icon: "User",
    href: "/settings/profile",
    showFor: ["RETAIL", "RESTAURANT"],
  },
  {
    id: "themes",
    label: "Themes",
    description: "Customize the app's appearance and color scheme",
    icon: "Palette",
    href: "/settings/themes",
    showFor: ["RETAIL", "RESTAURANT"],
  },
  {
    id: "currencies",
    label: "Currencies",
    description: "Manage currencies and exchange rates for your business",
    icon: "Landmark",
    href: "/settings/currencies",
    showFor: ["RETAIL", "RESTAURANT"],
  },
  {
    id: "colors",
    label: "Colors",
    description: "Manage colors for your categories and products",
    icon: "Droplet",
    href: "/settings/colors",
    showFor: ["RETAIL", "RESTAURANT"],
  },
  {
    id: "loyalty",
    label: "Loyalty Program",
    description: "Configure customer loyalty points, earning, and redemption",
    icon: "Award",
    href: "/settings/loyalty",
    showFor: ["RETAIL", "RESTAURANT"],
  },
  {
    id: "tenant",
    label: "Tenant Details",
    description: "Manage your tenant details",
    icon: "Building2",
    href: "/settings/tenant",
    showFor: ["RETAIL", "RESTAURANT"],
  },

  {
    id: "update",
    label: "Updates",
    description: "Check for and install the latest version",
    icon: "Download",
    href: "/settings/update",
    showFor: ["RETAIL", "RESTAURANT"],
  },
  {
    id: "about",
    label: "About",
    description: "App version and system information",
    icon: "Info",
    href: "/settings/about",
    showFor: ["RETAIL", "RESTAURANT"],
  },
  // Future sections:
  // {
  //   id: "taxes",
  //   label: "Taxes",
  //   description: "Configure tax rates and rules",
  //   icon: "Receipt",
  //   href: "/settings/taxes",
  //   showFor: ["RETAIL", "RESTAURANT"],
  // },
  // {
  //   id: "payment-methods",
  //   label: "Payment Methods",
  //   description: "Set up accepted payment methods",
  //   icon: "CreditCard",
  //   href: "/settings/payment-methods",
  //   showFor: ["RETAIL", "RESTAURANT"],
  // },
  // {
  //   id: "users",
  //   label: "Users & Permissions",
  //   description: "Manage staff accounts and access levels",
  //   icon: "Users",
  //   href: "/settings/users",
  //   showFor: ["RETAIL", "RESTAURANT"],
  // },
  // {
  //   id: "branches",
  //   label: "Branches",
  //   description: "Manage branch locations and settings",
  //   icon: "Building2",
  //   href: "/settings/branches",
  //   showFor: ["RETAIL", "RESTAURANT"],
  // },
];
