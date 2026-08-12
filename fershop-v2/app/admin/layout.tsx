import type { ReactNode } from "react";

import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { requireAuthenticatedPage } from "@/lib/auth";

import "./operations.css";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAuthenticatedPage();
  return <AdminLayoutShell session={session}>{children}</AdminLayoutShell>;
}
