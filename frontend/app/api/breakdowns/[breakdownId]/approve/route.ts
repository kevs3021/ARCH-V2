// app/api/breakdowns/[breakdownId]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';
import type { HistoryEntry } from '@/types/index';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ breakdownId: string }> }
) {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { breakdownId } = await params;
  const decodedBreakdownId = decodeURIComponent(breakdownId);
  const supabase = await createClient();

  // 1. Update the approver row
  const { error } = await supabase
    .from('breakdown_approvers')
    .update({
      status: 'Approved',
      approved_at: new Date().toISOString(),
    })
    .eq('breakdown_id', decodedBreakdownId)
    .eq('requestor_id', user.userId);

  if (error) {
    console.error('Error approving breakdown:', error);
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
  }

  // 2. Fetch the breakdown to get request_id
  const { data: breakdown, error: bdFetchError } = await supabase
    .from('breakdowns')
    .select('request_id')
    .eq('breakdown_id', decodedBreakdownId)
    .single();

  if (bdFetchError || !breakdown) {
    console.error('Error fetching breakdown:', bdFetchError);
    return NextResponse.json({ success: true }); // approver row updated; skip auto-transition
  }

  const { request_id } = breakdown;

  // 3. Fetch all breakdown_approvers for this request to check if all are Approved
  const { data: allApprovers, error: approversFetchError } = await supabase
    .from('breakdown_approvers')
    .select('status')
    .in(
      'breakdown_id',
      (
        await supabase
          .from('breakdowns')
          .select('breakdown_id')
          .eq('request_id', request_id)
      ).data?.map((b: { breakdown_id: string }) => b.breakdown_id) ?? []
    );

  if (approversFetchError) {
    console.error('Error fetching approvers:', approversFetchError);
    return NextResponse.json({ success: true });
  }

  const allApproved =
    Array.isArray(allApprovers) &&
    allApprovers.length > 0 &&
    allApprovers.every((a: { status: string }) => a.status.toLowerCase() === 'approved');

  if (!allApproved) {
    return NextResponse.json({ success: true });
  }

  // 4. All breakdowns approved — fetch current request status and history
  const { data: currentRequest, error: reqFetchError } = await supabase
    .from('other_requests')
    .select('status, history')
    .eq('request_id', request_id)
    .single();

  if (reqFetchError || !currentRequest) {
    console.error('Error fetching request:', reqFetchError);
    return NextResponse.json({ success: true });
  }

  const fromStatus = (currentRequest.status as string).toLowerCase();
  const currentHistory = Array.isArray(currentRequest.history) ? currentRequest.history : [];

  const systemEntry: HistoryEntry = {
    action: 'Status Changed',
    user: 'System',
    timestamp: new Date().toISOString(),
    from_status: fromStatus,
    to_status: 'approved',
  };

  // 5. Update request status to approved with system history entry
  const { error: updateError } = await supabase
    .from('other_requests')
    .update({
      status: 'approved',
      history: [...currentHistory, systemEntry],
    })
    .eq('request_id', request_id);

  if (updateError) {
    console.error('Error updating request status to approved:', updateError);
  }

  return NextResponse.json({ success: true });
}
