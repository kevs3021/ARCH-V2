// app/api/auth/lark/pending/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const larkCookie = request.cookies.get('lark_pending')?.value;

  if (!larkCookie) {
    return NextResponse.json({ success: false, error: 'No pending registration' }, { status: 404 });
  }

  try {
    const data = JSON.parse(larkCookie);
    return NextResponse.json({
      success: true,
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        companyEmail: data.companyEmail,
        email: data.email,
        profileUrl: data.profileUrl,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid cookie' }, { status: 400 });
  }
}
