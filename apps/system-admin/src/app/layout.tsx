import type { Metadata } from "next";

import "@repo/ui/globals";

export const metadata: Metadata = {
  title: "Pointverse - System Admin",
  description: "System administration portal for Pointverse platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
