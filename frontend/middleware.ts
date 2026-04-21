import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Use jose directly in middleware because it runs on the Edge runtime.
const getJWTKey = (): Uint8Array | null => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  const publicPaths = [
    "/login",
    "/api/auth/login",
    "/api/auth/lark",
    "/api/auth/lark/callback",
    "/auth/lark/callback",
  ];
  const rootPath = "/";

  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname.startsWith(path)) ||
    request.nextUrl.pathname === rootPath;

  const token = request.cookies.get("auth-token")?.value;
  let isValidToken = false;

  if (token) {
    const jwtKey = getJWTKey();
    if (jwtKey) {
      try {
        await jwtVerify(token, jwtKey);
        isValidToken = true;
      } catch {
        isValidToken = false;
      }
    } else {
      isValidToken = true;
    }
  }

  if (!isValidToken && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isValidToken && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/_next/static/")) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
