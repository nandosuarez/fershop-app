import { NextResponse } from "next/server";

function configuredPublicOrigin() {
  const configuredUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (!configuredUrl) {
    return null;
  }

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

export function publicUrl(request: Request, pathname: string) {
  const configuredOrigin = configuredPublicOrigin();
  if (configuredOrigin) {
    return new URL(pathname, configuredOrigin);
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const forwardedProtocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return new URL(pathname, `${forwardedProtocol}://${forwardedHost}`);
  }

  return new URL(pathname, request.url);
}

export function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(publicUrl(request, pathname), 303);
}
