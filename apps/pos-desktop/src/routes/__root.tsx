import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Header } from "../components/header";
import Providers from "../components/providers";
import Footer from "../components/footer";
import MainLayout from "../components/layouts/main-layout";

export const Route = createRootRoute({
  component: RootLayout,
});

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
