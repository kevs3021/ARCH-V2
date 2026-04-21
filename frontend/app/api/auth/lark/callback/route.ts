import { NextRequest, NextResponse } from 'next/server';
import { createToken, setAuthCookie } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { getLarkCompanyProfile, getUserAccessToken, getUserInfo } from '@/lib/lark';

const LARK_REDIRECT_URI = process.env.LARK_REDIRECT_URI;
const AUTH_NOTIFICATION_COOKIE = 'arch_auth_notification';

function redirectWithNotification(
  request: NextRequest,
  notification: { tone: 'message' | 'error'; title: string; message: string }
) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set(AUTH_NOTIFICATION_COOKIE, encodeURIComponent(JSON.stringify([notification])), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60,
    path: '/',
  });
  return response;
}

console.log('[Lark Callback] Starting - REDIRECT_URI:', LARK_REDIRECT_URI);

async function getLarkAccessToken(code: string) {
  const tokenResult = await getUserAccessToken(code, 'authorization_code');
  if (!tokenResult) {
    console.error('Failed to get user access token from Lark');
    return null;
  }
  return tokenResult;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      return redirectWithNotification(request, {
        tone: 'error',
        title: 'Login Error',
        message: 'Lark login was cancelled or denied.',
      });
    }

    const tokenResult = await getLarkAccessToken(code);
    console.log('Token data received:', tokenResult ? 'yes' : 'no');
    if (!tokenResult) {
      console.error('Token exchange failed - no access token');
      return redirectWithNotification(request, {
        tone: 'error',
        title: 'Login Error',
        message: 'Authorization failed. Please try again or contact support.',
      });
    }

    const larkUser = await getUserInfo(tokenResult.accessToken);
    console.log('User info received:', larkUser);
    if (!larkUser) {
      console.error('User info failed - no data');
      return redirectWithNotification(request, {
        tone: 'error',
        title: 'Login Error',
        message: 'Could not retrieve your profile. Please try again.',
      });
    }

    const larkOpenId = larkUser.openId;
    const larkName = larkUser.name;

    if (!larkOpenId) {
      console.error('No open_id in Lark user response');
      return redirectWithNotification(request, {
        tone: 'error',
        title: 'Login Error',
        message: 'Could not retrieve your profile. Please try again.',
      });
    }

    const companyProfile = await getLarkCompanyProfile(tokenResult.accessToken, larkOpenId);
    const larkEmail = companyProfile?.companyEmail || companyProfile?.personalEmail || larkUser.email || null;
    const larkProfileUrl = companyProfile?.avatarUrl || larkUser.avatarUrl || null;

    if (!larkEmail) {
      console.error('No email found for Lark user:', larkOpenId);
      return redirectWithNotification(request, {
        tone: 'error',
        title: 'Login Error',
        message: 'Could not retrieve your profile. Please try again.',
      });
    }

    const supabase = await createServerClient();

    let existingUser = null;

    console.log('Looking for user with open_id:', larkOpenId, 'and email:', larkEmail);

    if (larkEmail) {
      const { data: userByEmail } = await supabase
        .from('user_accounts')
        .select('*')
        .ilike('email', larkEmail)
        .maybeSingle();
      console.log('Found by email:', userByEmail);
      existingUser = userByEmail;
    }

    if (!existingUser) {
      const { data: userById } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('user_id', `lark_${larkOpenId}`)
        .maybeSingle();
      console.log('Found by user_id:', userById);
      existingUser = userById;
    }

    console.log('Final existingUser:', existingUser ? existingUser.user_id : 'not found');

    if (existingUser) {
      if (existingUser.status === 'Pending') {
        return redirectWithNotification(request, {
          tone: 'error',
          title: 'Pending Approval',
          message: 'Your account is still in pending status, contact administrator for further assistance',
        });
      }

      await supabase
        .from('user_accounts')
        .update({
          profile_url: larkProfileUrl || existingUser.profile_url || null,
          lark_bot_linked: true,
          lark_user_id: larkOpenId,
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

      await setAuthCookie(token);

      console.log('User logged in successfully:', existingUser.user_id);
      return NextResponse.redirect(new URL('/home', request.url));
    }

    const nameParts = larkName.split(' ') || [];
    const larkPayload = {
      larkUserId: larkOpenId,
      companyEmail: larkEmail,
      email: larkEmail,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      profileUrl: larkProfileUrl || '',
    };

    const response = NextResponse.redirect(new URL('/register', request.url));
    response.cookies.set('lark_pending', JSON.stringify(larkPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Lark callback error:', error);
    return redirectWithNotification(request, {
      tone: 'error',
      title: 'Login Error',
      message: 'An unexpected error occurred during login.',
    });
  }
}