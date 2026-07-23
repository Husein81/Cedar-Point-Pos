import MainLayout from "@/components/layouts/main-layout";
import { Modal } from "@/components/common/modal";
import { Shad } from "@repo/ui";
import { createRootRoute } from "@tanstack/react-router";
import Providers from "../components/providers";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <Providers>
      <Shad.ScrollArea className="h-screen flex flex-col overflow-hidden mt-8">
        <MainLayout />
        <Shad.ScrollBar />
      </Shad.ScrollArea>
      <Modal />
    </Providers>
  );
}
