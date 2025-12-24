"use client";

import { Button } from "@repo/ui";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { adminAuthApi } from "@/apis/authApi";

export function Header() {
  const handleSignOut = async () => {
    try {
      await adminAuthApi.logout();
      // Redirect to login page or handle logout state
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard - TO BE UPDATED!!!!!!
        </h1>
        <div className="flex items-center space-x-4">
          <Button variant="outline">Notifications</Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
          <Avatar>
            <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
