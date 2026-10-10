import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from "@/lib/auth/admin-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, Next.js internals, and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifyAdminSessionToken(sessionCookie) : null;
  const isAuthenticated = Boolean(session);

  // If visiting login page:
  if (pathname === "/login" || pathname === "/api/admin/auth/login") {
    if (isAuthenticated && pathname === "/login") {
      // Redirect already logged in admins to dashboard
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Allow public auth endpoints
  if (
    pathname === "/api/admin/auth/logout" ||
    pathname === "/api/admin/auth/session"
  ) {
    return NextResponse.next();
  }

  // Protect all /api/admin/* endpoints
  if (pathname.startsWith("/api/admin")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator session required." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Protect all other admin page routes
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
