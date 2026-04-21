import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookie } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

function deriveRoleFromPermissions(permissions: { request_branch: string; request_role: string }[]): string {
  if (permissions.length === 0) return 'requestor';
  
  const roles = new Set(permissions.map(p => p.request_role));
  
  if (roles.has('accounting')) return 'accounting';
  if (roles.has('approver')) return 'approver';
  if (roles.has('requestor')) return 'requestor';
  
  return 'requestor';
}

// Get current authenticated user
export async function GET(request: NextRequest) {
  try {
    // Verify JWT token from cookie
    const user = await getCurrentUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get full user profile from database
    const supabase = await createServerClient();
    
    const { data: userProfile, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('user_id', user.userId)
      .single();

    if (error || !userProfile) {
      // Return basic user info from token if profile not found
      return NextResponse.json({
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
        },
      });
    }

    // Get permissions to derive role
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('request_branch, request_role')
      .eq('user_id', user.userId);

    const derivedRole = deriveRoleFromPermissions(permissions || []);

    return NextResponse.json({
      user: {
        userId: userProfile.user_id,
        email: userProfile.email,
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: derivedRole,
        branch: userProfile.branch,
        campaign: userProfile.campaign,
        status: userProfile.status,
        profileUrl: userProfile.profile_url || null,
        isAdmin: userProfile.is_admin === true || userProfile.is_admin === 'true' || userProfile.is_admin === 1 || userProfile.is_admin === '1',
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { first_name, last_name, branch, campaign, settings_preferences } = body;

    const supabase = await createServerClient();
    
    const { data: updatedUser, error } = await supabase
      .from('user_accounts')
      .update({
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        branch: branch || undefined,
        campaign: campaign || undefined,
        settings_preferences: settings_preferences || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.userId)
      .select()
      .single();

    if (error) {
      console.error('Update user error:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}