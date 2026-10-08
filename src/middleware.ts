import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Pemeriksaan cepat berbasis cookie; validasi sesi & hak akses penuh ada di requireUser().
export function middleware(req: NextRequest) {
  if (!getSessionCookie(req)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|login|setup|katalog|_next|uploads|favicon.ico).*)"],
};
