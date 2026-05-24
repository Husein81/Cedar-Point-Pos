import { Modal, UnderConstruction } from "@/components/common";
import MainLayout from "@/components/layouts/main-layout";
import { OfflineSyncService } from "@/hooks/useOfflineSync";
import { Shad } from "@repo/ui";
import { createRootRoute } from "@tanstack/react-router";
import Providers from "../components/providers";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: UnderConstruction,
});

function RootLayout() {
  return (
    <Providers>
      <Shad.ScrollArea className="h-screen flex flex-col overflow-hidden">
        <MainLayout />
        <Shad.ScrollBar />
      </Shad.ScrollArea>
      <Modal />
      <OfflineSyncService />
    </Providers>
  );
}
