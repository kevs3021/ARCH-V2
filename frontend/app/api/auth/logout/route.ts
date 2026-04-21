import { NextRequest, NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// Logout - clear session and redirect
export async function POST(request: NextRequest) {
  try {
    // Clear the auth cookie
    await removeAuthCookie();

    // Sign out from Supabase if needed
    const supabase = await createServerClient();
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}