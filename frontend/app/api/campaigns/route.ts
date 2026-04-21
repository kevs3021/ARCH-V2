import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, campaign_name, status')
      .eq('status', 'Active')
      .order('campaign_name', { ascending: true });

    if (error) {
      console.error('Failed to fetch campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    return NextResponse.json(campaigns || []);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
