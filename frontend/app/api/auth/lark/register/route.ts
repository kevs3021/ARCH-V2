// app/api/auth/lark/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Read the pending Lark cookie
    const larkCookie = request.cookies.get('lark_pending')?.value;
    if (!larkCookie) {
      return NextResponse.json({ error: 'No pending Lark registration' }, { status: 400 });
    }

    const larkData = JSON.parse(larkCookie);
    const body = await request.json();

    const { branch, campaign, role, firstName, lastName } = body;
    const companyEmail = larkData.companyEmail || larkData.email || null;

    if (!branch || !campaign) {
      return NextResponse.json({ error: 'Branch and campaign are required' }, { status: 400 });
    }

    if (!companyEmail) {
      return NextResponse.json({ error: 'Email is required for Lark registration' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Check if email already taken
    const { data: existing } = await supabase
      .from('user_accounts')
      .select('user_id')
      .eq('email', companyEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Account already exists' }, { status: 409 });
    }

    // Generate user_id - use stable ID without timestamp
    const userId = `lark_${larkData.larkUserId}`;

    // Create user
    const { error: createError } = await supabase
      .from('user_accounts')
      .insert({
        user_id: userId,
        email: companyEmail,
        first_name: firstName || larkData.firstName || null,
        last_name: lastName || larkData.lastName || null,
        profile_url: larkData.profileUrl || null,
        lark_bot_linked: true,
        is_admin: role === 'admin',
        status: 'Pending',
        branch: branch || null,
        campaign: campaign || null,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      });

    if (createError) {
      console.error('Failed to create user:', createError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Clear the pending cookie
    const response = NextResponse.json({
      success: true,
      redirectTo: '/login',
      notification: {
        tone: 'message',
        title: 'Pending Approval',
        message: 'Your account is pending for approval',
      },
    });
    response.cookies.delete('lark_pending');

    return response;
  } catch (error) {
    console.error('Lark register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
