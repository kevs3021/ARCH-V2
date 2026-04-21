import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// JWT secret key
const getJWTKey = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return new TextEncoder().encode(secret);
};

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// Create a JWT token
export async function createToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const jwtKey = getJWTKey();
  
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtKey);
  
  return token;
}

// Verify and decode a JWT token
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const jwtKey = getJWTKey();
    const { payload } = await jwtVerify(token, jwtKey);
    
    // Validate required fields (isAdmin can be boolean or string representation)
    const isAdmin = payload.isAdmin === true || payload.isAdmin === 'true' || payload.isAdmin === '1';
    if (!payload.userId || !payload.email || !payload.name) {
      console.error('Token payload missing required fields');
      return null;
    }
    
    // Cast through unknown to avoid type error
    return { ...payload, isAdmin } as unknown as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Get current user from request
export async function getCurrentUser(request: NextRequest): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return verifyToken(token);
}

// Get current user from cookies (server-side)
export async function getCurrentUserFromCookie(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }
    
    return verifyToken(token);
  } catch (error) {
    console.error('Failed to get user from cookie:', error);
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Remove auth cookie
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

// Auth middleware helper
export function withAuth(
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return handler(request, user);
  };
}

// Route handler helpers
export async function requireAuth(): Promise<TokenPayload> {
  const user = await getCurrentUserFromCookie();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}