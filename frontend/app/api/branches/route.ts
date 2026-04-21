import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: branches, error } = await supabase
      .from('branches')
      .select('id, branch, status')
      .eq('status', 'active')
      .order('branch', { ascending: true });

    if (error) {
      console.error('Failed to fetch branches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch branches' },
        { status: 500 }
      );
    }

    return NextResponse.json(branches || []);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
