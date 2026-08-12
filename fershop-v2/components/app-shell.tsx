"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const usesPrivateShell = pathname.startsWith("/admin") || pathname === "/login";

  return (
    <div className="page-shell">
      {usesPrivateShell ? null : <SiteHeader />}
      {children}
      {usesPrivateShell ? null : <SiteFooter />}
    </div>
  );
}
