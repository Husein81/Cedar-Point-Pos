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
    icon: "Palette",
    href: "/settings/colors",
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
