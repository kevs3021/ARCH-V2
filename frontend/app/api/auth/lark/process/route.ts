import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { getLarkCompanyProfile, getUserAccessToken, getUserInfo } from '@/lib/lark';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'No code provided' }, { status: 400 });
    }

    const tokenResult = await getUserAccessToken(code, 'authorization_code');
    if (!tokenResult) {
      console.error('Token exchange failed');
      return NextResponse.json({ success: false, error: 'Token exchange failed' }, { status: 400 });
    }

    const larkUser = await getUserInfo(tokenResult.accessToken);
    if (!larkUser) {
      return NextResponse.json({ success: false, error: 'User info failed' }, { status: 400 });
    }

    const larkOpenId = larkUser.openId;
    const companyProfile = await getLarkCompanyProfile(tokenResult.accessToken, larkOpenId);
    const companyEmail = companyProfile?.companyEmail || null;
    const fallbackEmail = companyProfile?.personalEmail || larkUser.email || null;
    const registrationEmail = companyEmail || fallbackEmail;
    const profileUrl = companyProfile?.avatarUrl || larkUser.avatarUrl || null;

    if (!registrationEmail) {
      return NextResponse.json({ success: false, error: 'user_info_failed' }, { status: 400 });
    }

    const supabase = await createServerClient();

    const { data: existingUser } = await supabase
      .from('user_accounts')
      .select('*')
      .or(`email.eq.${registrationEmail},user_id.eq.lark_${larkOpenId}`)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.status === 'Pending') {
        return NextResponse.json({ success: false, error: 'pending_status' }, { status: 403 });
      }

      await supabase
        .from('user_accounts')
        .update({
          profile_url: profileUrl,
          lark_bot_linked: true,
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        })
        .eq('user_id', existingUser.user_id);

      const token = await createToken({
        userId: existingUser.user_id,
        email: existingUser.email,
        name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim(),
        role: existingUser.role || 'requestor',
        isAdmin: existingUser.is_admin === true || existingUser.is_admin === 'true' || existingUser.is_admin === 1 || existingUser.is_admin === '1',
      });

      const response = NextResponse.json({ success: true, redirectTo: '/home' });
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return response;
    }

    const nameParts = larkUser.name.split(' ') || [];
    const larkPayload = {
      larkUserId: larkOpenId,
      companyEmail,
      email: registrationEmail,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      profileUrl: profileUrl || '',
    };

    const response = NextResponse.json({ success: true, redirectTo: '/register' });
    response.cookies.set('lark_pending', JSON.stringify(larkPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Lark process error:', error);
    return NextResponse.json({ success: false, error: 'Callback failed' }, { status: 500 });
  }
}