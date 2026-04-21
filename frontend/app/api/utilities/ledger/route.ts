import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'branches';
    const search = searchParams.get('search') || '';

    let query = supabase.from(type).select('*');

    if (search) {
      const column = type === 'branches' ? 'branch' : type === 'campaigns' ? 'campaign_name' : 'name';
      query = query.ilike(column, `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error(`Failed to fetch ${type}:`, error);
      return NextResponse.json(
        { error: `Failed to fetch ${type}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { type, name, code, docClass, bank, campaignId, company } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (type === 'branches') {
      const { data: existing } = await supabase
        .from('branches')
        .select('id')
        .eq('branch', name)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'Branch name already exists' },
          { status: 409 }
        );
      }

      const { data, error } = await supabase
        .from('branches')
        .insert({
          branch: name,
          branch_code: code || '',
          branch_doc_class: docClass || '',
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create branch:', error);
        return NextResponse.json(
          { error: 'Failed to create branch' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } else if (type === 'campaigns') {
      const { data: existing } = await supabase
        .from('campaigns')
        .select('id')
        .eq('campaign_name', name)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'Campaign name already exists' },
          { status: 409 }
        );
      }

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          campaign_name: name,
          bank: bank || '',
          campaign_id: campaignId || '',
          company: company || '',
          status: 'Active',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create campaign:', error);
        return NextResponse.json(
          { error: 'Failed to create campaign' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } else if (type === 'particulars') {
      const { data: existing } = await supabase
        .from('particulars')
        .select('id')
        .eq('name', name)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'Particular name already exists' },
          { status: 409 }
        );
      }

      const { data, error } = await supabase
        .from('particulars')
        .insert({
          id: crypto.randomUUID(),
          name: name,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create particular:', error);
        return NextResponse.json(
          { error: 'Failed to create particular' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Invalid type' },
      { status: 400 }
    );
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { type, id, action } = body;

    if (!id || !type || !action) {
      return NextResponse.json(
        { error: 'ID, type, and action are required' },
        { status: 400 }
      );
    }

    const newStatus = action === 'disable'
      ? (type === 'branches' ? 'inactive' : type === 'particulars' ? 'inactive' : 'Inactive')
      : (type === 'branches' ? 'active' : type === 'particulars' ? 'active' : 'Active');

    const { error } = await supabase
      .from(type)
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error(`Failed to ${action} ${type}:`, error);
      return NextResponse.json(
        { error: `Failed to ${action}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}