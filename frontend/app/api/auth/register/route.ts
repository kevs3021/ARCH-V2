import { NextRequest, NextResponse } from 'next/server';
import { createToken, setAuthCookie } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, branch, campaign, role } = body;

    if (!email || !password || !firstName || !lastName || !branch || !campaign) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password with SHA-256
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    // Generate unique user_id
    const userId = `user_${crypto.randomUUID().slice(0, 12)}`;

    // Create new user
    const { error: insertError } = await supabase
      .from('user_accounts')
      .insert({
        user_id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        branch,
        campaign,
        is_admin: role === 'admin',
        status: 'Active',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Registration insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create JWT token
    const token = await createToken({
      userId,
      email,
      name: `${firstName} ${lastName}`,
      role: role || 'requestor',
      isAdmin: role === 'admin',
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        userId,
        email,
        firstName,
        lastName,
        branch,
        campaign,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}