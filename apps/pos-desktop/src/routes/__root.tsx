import { UnderConstruction } from "@/components/under-construction";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import Footer from "../components/footer";
import { Header } from "../components/header";
import MainLayout from "../components/layouts/main-layout";
import Providers from "../components/providers";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: UnderConstruction,
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
