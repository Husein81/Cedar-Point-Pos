"use client";

import { Icon } from "../components";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function Loading({
  title = "Starting POS",
  subtitle = "Preparing your workspace…",
}: Props) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      {/* Logo / Brand */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Cedar Core POS</h1>
        <p className="text-sm text-muted-foreground">
          Retail & Restaurant System
        </p>
      </div>

      {/* Spinner */}
      <div className="flex items-center gap-3">
        <Icon name="LoaderCircle" className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm font-medium">{title}</span>
      </div>

      {/* Subtitle */}
      <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
