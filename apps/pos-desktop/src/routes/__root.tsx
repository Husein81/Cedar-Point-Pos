import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Header } from "../components/header";
import Providers from "../components/providers";
import Footer from "../components/footer";
import MainLayout from "../components/layouts/main-layout";

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
      <MainLayout>
        <Outlet />
      </MainLayout>
      <Footer />
    </Providers>
  );
}
