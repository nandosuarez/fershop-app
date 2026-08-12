import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import type { SessionData, UserRole } from "@/lib/auth-types";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const adminRoles: UserRole[] = ["SUPERADMIN", "ADMIN"];

export function isAdminRole(role: UserRole | string) {
  return adminRoles.includes(role as UserRole);
}

export async function getPageSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null);
}

export async function requireAuthenticatedPage(): Promise<SessionData> {
  const session = await getPageSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireAdminPage(): Promise<SessionData> {
  const session = await requireAuthenticatedPage();
  if (!isAdminRole(session.role)) {
    redirect("/admin?error=forbidden");
  }
  return session;
}

export function getRequestSession(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null);
}

export function requireAuthenticatedRequest(request: NextRequest): SessionData | NextResponse {
  const session = getRequestSession(request);
  return session ?? NextResponse.json({ message: "Tu sesion expiro." }, { status: 401 });
}

export function requireAdminRequest(request: NextRequest): SessionData | NextResponse {
  const session = requireAuthenticatedRequest(request);
  if (session instanceof NextResponse) {
    return session;
  }
  return isAdminRole(session.role)
    ? session
    : NextResponse.json({ message: "No tienes permiso para realizar esta accion." }, { status: 403 });
}
