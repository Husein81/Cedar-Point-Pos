import type { Metadata } from "next";

import "@repo/ui/globals";
import { QueryProvider } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Cedar Point Pos - System Admin",
  description: "System administration portal for Cedar Pos platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
