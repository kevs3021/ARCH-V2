import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Using jose directly in middleware since it runs on Edge runtime
const getJWTKey = (): Uint8Array | null => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  // Public paths that do not require authentication
  const publicPaths = ['/login', '/api/auth/login', '/api/auth/lark', '/api/auth/lark/callback', '/auth/lark/callback'];
  const rootPath = '/';
  
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path)) || request.nextUrl.pathname === rootPath;

  // Check for the custom auth token
  const token = request.cookies.get('auth-token')?.value;
  let isValidToken = false;

  if (token) {
    const jwtKey = getJWTKey();
    if (jwtKey) {
      try {
        await jwtVerify(token, jwtKey);
        isValidToken = true;
      } catch (e) {
        // Invalid or expired token
        isValidToken = false;
      }
    } else {
      // Fallback if no JWT key is found in environment
      isValidToken = true;
    }
  }

  // Protect private routes - redirect to login
  if (!isValidToken && !isPublicPath) {
    // Use 307 to preserve the request method
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to home if logged in and trying to access login page
  if (isValidToken && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // OPTIMIZATION: Add cache headers for static assets
  const response = NextResponse.next();
  
  // Cache public assets for 1 hour
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};