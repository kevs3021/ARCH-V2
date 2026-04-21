const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;

export type LarkCompanyProfile = {
  avatarUrl: string | null;
  companyEmail: string | null;
  personalEmail: string | null;
  displayName: string;
};

export async function getLarkCompanyProfile(
  accessToken: string,
  openId: string
): Promise<LarkCompanyProfile | null> {
  try {
    const response = await fetch(
      `https://open.larksuite.com/open-apis/contact/v3/users/${encodeURIComponent(openId)}?user_id_type=open_id`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();

    if (!data.data) return null;

    return {
      avatarUrl:
        data.data.avatar?.avatar_240 ||
        data.data.avatar?.avatar_72 ||
        data.data.avatar_big ||
        data.data.avatar_middle ||
        data.data.avatar_thumb ||
        data.data.avatar_url ||
        null,
      companyEmail: data.data.enterprise_email || null,
      personalEmail: data.data.email || null,
      displayName: data.data.name || data.data.en_name || '',
    };
  } catch (error) {
    console.error('Lark contact user error:', error);
    return null;
  }
}

export async function getAppAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
    });
    const data = await response.json();
    return data.data?.app_access_token ?? data.app_access_token ?? data.tenant_access_token ?? null;
  } catch (error) {
    console.error('Lark app access token error:', error);
    return null;
  }
}

export async function getUserAccessToken(
  code: string,
  grantType: string = 'authorization_code'
): Promise<{ accessToken: string; tokenType: string; expiresIn: number } | null> {
  try {
    const appToken = await getAppAccessToken();
    if (!appToken) return null;

    const response = await fetch('https://open.larksuite.com/open-apis/authen/v1/oidc/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appToken}`,
      },
      body: JSON.stringify({ grant_type: grantType, code }),
    });
    const data = await response.json();

    if (!data.data?.access_token) return null;

    return {
      accessToken: data.data.access_token,
      tokenType: data.data.token_type || 'Bearer',
      expiresIn: data.data.expires_in || 0,
    };
  } catch (error) {
    console.error('Lark user access token error:', error);
    return null;
  }
}

export async function getUserInfo(
  accessToken: string
): Promise<{
  openId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
} | null> {
  try {
    const response = await fetch('https://open.larksuite.com/open-apis/authen/v1/user_info', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();

    if (!data.data) return null;

    return {
      openId: data.data.open_id || data.data.user_id || '',
      name: data.data.name || data.data.en_name || '',
      email: data.data.email || null,
      avatarUrl: data.data.avatar?.avatar_240 || data.data.avatar?.avatar_72 || null,
    };
  } catch (error) {
    console.error('Lark user info error:', error);
    return null;
  }
}

export function generateOAuthUrl(
  redirectUri: string,
  state: string,
  scope?: string
): string {
  const appId = LARK_APP_ID || '';
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scope || 'contact:user.base:readonly',
    skip_prompt: 'true',
  });

  return `https://accounts.larksuite.com/open-apis/authen/v1/authorize?${params.toString()}`;
}
