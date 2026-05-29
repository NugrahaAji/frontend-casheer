import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const role = request.cookies.get("role")?.value;

  const url = request.nextUrl.clone();
  const { pathname } = url;

  // 1. Skip proxy for static assets, next internal files, and public images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. If the user is NOT authenticated
  if (!token) {
    // Prevent unauthenticated access to dashboard/owner pages, redirect to "/" (login)
    if (pathname !== "/") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 3. If the user IS authenticated and tries to access the login page "/"
  if (pathname === "/") {
    if (role === "owner") {
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 4. Role-based Authorization Guard
  if (role === "owner") {
    // Owner should not access cashier-specific POS pages like /dashboard (POS cashier desk) or /keuangan
    if (pathname === "/dashboard" || pathname === "/keuangan") {
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    }
  } else {
    // Kasir / Cashier should not access owner-only pages
    const isOwnerPage =
      pathname.startsWith("/owner") ||
      pathname.startsWith("/stok-barang") ||
      pathname.startsWith("/laporan") ||
      pathname.startsWith("/pengeluaran") ||
      pathname.startsWith("/karyawan");

    if (isOwnerPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

// Support matcher to run proxy on all relevant page routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
