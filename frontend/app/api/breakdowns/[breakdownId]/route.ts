// app/api/breakdowns/[breakdownId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';
import type { HistoryEntry } from '@/types/index';

export async function PATCH(
  request: NextRequest,
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

  // 2. Role check — only requestor or admin
  if (effectiveRole !== 'requestor' && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
  }

  const { breakdownId } = await params;
  const decodedBreakdownId = decodeURIComponent(breakdownId);

  // 3. Fetch the breakdown
  const { data: breakdown, error: bdFetchError } = await supabase
    .from('breakdowns')
    .select('breakdown_id, request_id, particulars')
    .eq('breakdown_id', decodedBreakdownId)
    .single();

  if (bdFetchError || !breakdown) {
    return NextResponse.json({ error: 'Breakdown not found' }, { status: 404 });
  }

  const { request_id } = breakdown;

  // 4. Fetch the parent request to check status
  const { data: parentRequest, error: reqFetchError } = await supabase
    .from('other_requests')
    .select('status, history')
    .eq('request_id', request_id)
    .single();

  if (reqFetchError || !parentRequest) {
    return NextResponse.json({ error: 'Parent request not found' }, { status: 404 });
  }

  if (parentRequest.status !== 'open') {
    return NextResponse.json(
      { error: 'Forbidden: request is not editable in its current status' },
      { status: 403 }
    );
  }

  // 5. Parse body — accept any subset of editable fields
  const body = await request.json();
  const { particulars, amount, purpose, store } = body as {
    particulars?: string;
    amount?: number | null;
    purpose?: string | null;
    store?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (particulars !== undefined) updates.particulars = particulars;
  if (amount !== undefined) updates.amount = amount;
  if (purpose !== undefined) updates.purpose = purpose;
  if (store !== undefined) updates.store = store;

  // 6. Update the breakdown
  const { error: updateError } = await supabase
    .from('breakdowns')
    .update(updates)
    .eq('breakdown_id', decodedBreakdownId);

  if (updateError) {
    console.error('Error updating breakdown:', updateError);
    return NextResponse.json({ error: 'Failed to update breakdown' }, { status: 500 });
  }

  // 7. Append history entry to parent request
  const effectiveParticulars = particulars ?? breakdown.particulars;
  const currentHistory = Array.isArray(parentRequest.history) ? parentRequest.history : [];

  const historyEntry: HistoryEntry & { details?: string } = {
    action: 'Breakdown Edited',
    user: user.name,
    timestamp: new Date().toISOString(),
    details: effectiveParticulars,
  } as HistoryEntry;

  const { error: historyError } = await supabase
    .from('other_requests')
    .update({ history: [...currentHistory, historyEntry] })
    .eq('request_id', request_id);

  if (historyError) {
    console.error('Error appending history entry:', historyError);
    // Non-fatal — breakdown was updated; log and continue
  }

  return NextResponse.json({ success: true });
}
