import { useAuthStore } from "@/store/authStore";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "../header";
import ClientLayout from "./client-layout";

const MainLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/auth" });
    }
  }, [isAuthenticated]);

  return (
    <ClientLayout>
      <Header />
      <Outlet />
    </ClientLayout>
  );
};

export default MainLayout;
