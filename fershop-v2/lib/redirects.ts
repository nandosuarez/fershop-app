import { NextResponse } from "next/server";

export function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), 303);
}
