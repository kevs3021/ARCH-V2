// app/api/breakdowns/[breakdownId]/recorded/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ breakdownId: string }> }
) {
  // 1. Authenticate
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Derive role from permissions
  const supabase = await createClient();
  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('request_role')
    .eq('user_id', user.userId);

  const roles = new Set(permissions?.map(p => p.request_role) || []);
  const effectiveRole = roles.has('requestor') ? 'requestor' : roles.has('approver') ? 'approver' : roles.has('accounting') ? 'accounting' : 'requestor';

  // 2. Role check — only accounting or admin
  if (effectiveRole !== 'accounting' && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
  }

  const { breakdownId } = await params;
  const decodedBreakdownId = decodeURIComponent(breakdownId);

  // 3. Fetch current recorded value
  const { data: breakdown, error: fetchError } = await supabase
    .from('breakdowns')
    .select('breakdown_id, recorded')
    .eq('breakdown_id', decodedBreakdownId)
    .single();

  if (fetchError || !breakdown) {
    return NextResponse.json({ error: 'Breakdown not found' }, { status: 404 });
  }

  // 4. Toggle recorded in a single update
  const { error: updateError } = await supabase
    .from('breakdowns')
    .update({ recorded: !breakdown.recorded })
    .eq('breakdown_id', decodedBreakdownId);

  if (updateError) {
    console.error('Error toggling recorded:', updateError);
    return NextResponse.json({ error: 'Failed to update recorded status' }, { status: 500 });
  }

  return NextResponse.json({ success: true, recorded: !breakdown.recorded });
}
