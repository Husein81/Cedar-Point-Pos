import { useAuthStore, getLastUserId } from "@/store/authStore";
import { AUTH_ROUTE } from "@/constants/auth";
import { useResumeSession } from "@/hooks/useAuth";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Header } from "../header";
import ClientLayout from "./client-layout";

const MainLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const resumeSession = useResumeSession();

  // Only worth attempting once per app launch — a failed/successful resume
  // shouldn't retry just because isAuthenticated flips during this render.
  const attemptedResume = useRef(false);

  useEffect(() => {
    if (isAuthenticated || attemptedResume.current) return;
    attemptedResume.current = true;

    const lastUserId = getLastUserId();
    if (!lastUserId) {
      navigate({ to: AUTH_ROUTE });
      return;
    }

    resumeSession.mutate(lastUserId, {
      onError: () => navigate({ to: AUTH_ROUTE }),
    });
  }, [isAuthenticated, navigate, resumeSession]);

  if (!isAuthenticated) {
    // Still deciding whether a remembered session can be restored — avoid
    // flashing the login screen while that round-trip is in flight.
    // if (!attemptedResume.current || resumeSession.isPending) {
    //   return (
    //     <div className="flex min-h-screen items-center justify-center">
    //       <Icon name="LoaderCircle" className="animate-spin" />
    //     </div>
    //   );
    // }

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
