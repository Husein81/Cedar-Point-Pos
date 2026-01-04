import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Header } from "../components/header";
import Providers from "../components/providers";
import Footer from "../components/footer";
import MainLayout from "../components/layouts/main-layout";
import { Shad } from "@repo/ui";
import { Modal } from "@/components/common/modal";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600">Page not found</p>
      </div>
    </div>
  );
}

function RootLayout() {
  return (
    <Providers>
      <Header />
      <Shad.ScrollArea className="h-screen flex flex-col overflow-hidden">
        <MainLayout>
          <Outlet />
        </MainLayout>
        <Footer />
        <Shad.ScrollBar />
      </Shad.ScrollArea>
      <Modal />
    </Providers>
  );
}
