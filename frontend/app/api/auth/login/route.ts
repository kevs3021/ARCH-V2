import { NextRequest, NextResponse } from 'next/server';
import { createToken, setAuthCookie } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase server client
    const supabase = await createServerClient();

    // Find user by email in user_accounts table
    const { data: userData, error: userError } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (userData.account_locked) {
      return NextResponse.json(
        { error: 'Account is locked. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Check if account is active
    if (userData.status === 'Disabled') {
      return NextResponse.json(
        { error: 'Account is disabled. Please contact administrator.' },
        { status: 403 }
      );
    }

    if (userData.status === 'Pending') {
      return NextResponse.json(
        { error: 'Your account is still in pending status, contact administrator for further assistance' },
        { status: 403 }
      );
    }

    // Verify password (SHA-256 hash)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    if (passwordHash !== userData.password_hash) {
      // Increment failed login attempts
      await supabase
        .from('user_accounts')
        .update({ failed_login_attemps: (userData.failed_login_attemps || 0) + 1 })
        .eq('user_id', userData.user_id);

      // Lock account after 5 failed attempts
      if ((userData.failed_login_attemps || 0) + 1 >= 5) {
        await supabase
          .from('user_accounts')
          .update({ account_locked: true })
          .eq('user_id', userData.user_id);
        
        return NextResponse.json(
          { error: 'Too many failed attempts. Account locked.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login
    await supabase
      .from('user_accounts')
      .update({ 
        failed_login_attemps: 0,
        last_login: new Date().toISOString()
      })
      .eq('user_id', userData.user_id);

    // Create JWT token from user profile
    const isAdminValue = userData.is_admin === true || userData.is_admin === 'true' || userData.is_admin === 1 || userData.is_admin === '1';
    const tokenPayload = {
      userId: userData.user_id,
      email: userData.email,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      role: userData.role || 'requestor',
      isAdmin: isAdminValue,
    };

    const token = await createToken(tokenPayload);
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        userId: userData.user_id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        isAdmin: userData.is_admin,
        branch: userData.branch,
        campaign: userData.campaign,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
