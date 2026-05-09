import { useAuthStore } from "@/store/authStore";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "../header";
import ClientLayout from "./client-layout";

const MainLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Initialize global barcode scanner listener
  useBarcodeScanner();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/auth" });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col">
        <Header />
        <Outlet />
      </div>
    );
  }

  return (
    <ClientLayout>
      <Header />
      <Outlet />
    </ClientLayout>
  );
};

export default MainLayout;
