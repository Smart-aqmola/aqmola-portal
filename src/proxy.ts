import { NextResponse, type NextRequest } from "next/server";
import { hasLocale, pickLocale } from "@/shared/i18n/config";

/** Send visitors to /ru, /kk or /en based on the browser language. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";
  if (hasLocale(firstSegment)) return NextResponse.next();

  const locale = pickLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals, API routes and files with an extension (images, favicon).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
