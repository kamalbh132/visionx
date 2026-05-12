import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const roleBasedRoutes: Record<string, string[]> = {
  "/admin": ["ADMIN", "SUPERADMIN"],
  "/superadmin": ["SUPERADMIN"],
  "/user": ["USER", "ADMIN", "SUPERADMIN"],
  "/dashboard": ["USER", "ADMIN", "SUPERADMIN"],
  "/messages": ["USER", "ADMIN", "SUPERADMIN"],
};

const protectedRoutes = [
  "/admin",
  "/superadmin",
  "/user",
  "/dashboard",
  "/verification",
  "/messages",
];

function getDashboard(role?: string): string {
  if (role === "SUPERADMIN") return "/superadmin/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";
  return "/user/dashboard";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const userRole = token?.role as string | undefined;
  const isVerified = token?.isVerified as boolean | undefined;

  // 1. No token → block protected routes
  if (!token) {
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return NextResponse.next();
  }

  // 2. Not verified → only allow /verification
  if (!isVerified) {
    if (!pathname.startsWith("/verification")) {
      return NextResponse.redirect(new URL("/verification", request.url));
    }
    return NextResponse.next();
  }

  // 3. Verified on /verification → go to dashboard
  if (isVerified && pathname.startsWith("/verification")) {
    return NextResponse.redirect(new URL(getDashboard(userRole), request.url));
  }

  // 4. Role-based route access check
  for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        return NextResponse.redirect(
          new URL(getDashboard(userRole), request.url)
        );
      }
    }
  }

  // 5. Authenticated user on auth pages → go to dashboard
  if (
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/signup")
  ) {
    return NextResponse.redirect(new URL(getDashboard(userRole), request.url));
  }

  // 6. Authenticated on landing page → go to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL(getDashboard(userRole), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/superadmin/:path*",
    "/user/:path*",
    "/dashboard/:path*",
    "/verification/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/auth/:path*",
    "/messages/:path*",
  ],
};