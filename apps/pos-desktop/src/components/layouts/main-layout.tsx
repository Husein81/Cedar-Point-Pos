import { useAuthStore } from "@/store/authStore";
import AuthLayout from "./auth-layout";
import ClientLayout from "./client-layout";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({
        to: "/",
      });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return <ClientLayout>{children}</ClientLayout>;
  }

  return <AuthLayout />;
};

export default MainLayout;
