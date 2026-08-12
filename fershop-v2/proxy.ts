import { NextRequest, NextResponse } from "next/server";

import { publicUrl } from "@/lib/redirects";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const publicApiPaths = ["/api/auth/login", "/api/auth/logout", "/api/health"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicApiPaths.includes(pathname)) {
    return NextResponse.next();
  }
  if (request.method === "GET" && pathname.startsWith("/api/products/images/")) {
    return NextResponse.next();
  }

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Tu sesion expiro." }, { status: 401 });
    }
    return NextResponse.redirect(publicUrl(request, "/login"));
  }

  if (
    (pathname.startsWith("/admin/usuarios") || pathname.startsWith("/api/users") || pathname.startsWith("/api/backup")) &&
    session.role !== "SUPERADMIN" &&
    session.role !== "ADMIN"
  ) {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ message: "No tienes permiso para realizar esta accion." }, { status: 403 })
      : NextResponse.redirect(publicUrl(request, "/admin?error=forbidden"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
