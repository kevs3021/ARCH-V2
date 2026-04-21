// app/api/breakdowns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';
import type { HistoryEntry } from '@/types/index';

export async function POST(request: NextRequest) {
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

  // Role check — only requestor or admin
  if (effectiveRole !== 'requestor' && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
  }

  const body = await request.json();
  const { request_id, particulars, amount, purpose, store, approver_ids } = body;

  if (!request_id || !particulars) {
    return NextResponse.json({ error: 'Request ID and particulars are required' }, { status: 400 });
  }

  const breakdown_id = `BD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Insert breakdown
  const { data: breakdown, error: breakdownError } = await supabase
    .from('breakdowns')
    .insert({
      breakdown_id,
      request_id,
      particulars,
      amount: amount || null,
      purpose: purpose || null,
      store: store || null,
      requestor_id: user.userId,
      status: 'Pending',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (breakdownError) {
    console.error('Error creating breakdown:', breakdownError);
    return NextResponse.json({ error: 'Failed to create breakdown' }, { status: 500 });
  }

  // Insert approvers if provided
  if (approver_ids && Array.isArray(approver_ids) && approver_ids.length > 0) {
    const approverRows = approver_ids.map((approverId: string) => ({
      breakdown_id,
      requestor_id: approverId,
      status: 'Pending',
    }));

    const { error: approverError } = await supabase
      .from('breakdown_approvers')
      .insert(approverRows);

    if (approverError) {
      console.error('Error creating approvers:', approverError);
    }
  }

  // Get all breakdowns for this request and calculate total
  const { data: allBreakdowns } = await supabase
    .from('breakdowns')
    .select('amount')
    .eq('request_id', request_id);

  const totalBreakdownAmount = (allBreakdowns || []).reduce(
    (sum: number, b: { amount: number | null }) => sum + (b.amount ?? 0),
    0
  );

  // Update the parent request's amount with total breakdown amount
  const { error: updateAmountError } = await supabase
    .from('other_requests')
    .update({ amount: totalBreakdownAmount })
    .eq('request_id', request_id);

  if (updateAmountError) {
    console.error('Error updating request amount:', updateAmountError);
  }

  // Append history entry to parent request
  const { data: parentRequest } = await supabase
    .from('other_requests')
    .select('history')
    .eq('request_id', request_id)
    .single();

  const currentHistory = Array.isArray(parentRequest?.history) ? parentRequest.history : [];
  const historyEntry: HistoryEntry & { details?: string } = {
    action: 'Breakdown Added',
    user: user.name,
    timestamp: new Date().toISOString(),
    details: particulars,
  } as HistoryEntry;

  const { error: historyError } = await supabase
    .from('other_requests')
    .update({ history: [...currentHistory, historyEntry] })
    .eq('request_id', request_id);

  if (historyError) {
    console.error('Error appending history entry:', historyError);
    // Non-fatal — breakdown was created; log and continue
  }

  return NextResponse.json({ success: true, data: breakdown }, { status: 201 });
}
