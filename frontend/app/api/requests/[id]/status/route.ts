// app/api/requests/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';
import { getPermittedTransitions, EffectiveRole } from '@/lib/requestDetailUtils';
import { RequestStatusType } from '@/config/status';
import { HistoryEntry } from '@/types/index';

function mapRoleToEffectiveRole(role: string): EffectiveRole | null {
  switch (role) {
    case 'requestor':
    case 'approver':
    case 'accounting':
    case 'admin':
      return role as EffectiveRole;
    default:
      return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[DEBUG] user:', JSON.stringify(user));
  console.log('[DEBUG] user.isAdmin type:', typeof user.isAdmin, 'value:', user.isAdmin);
  console.log('[DEBUG] user.role:', user.role);

  // Derive role from permissions
  const supabase = await createClient();

  // Also fetch is_admin from user_accounts table as backup check
  const { data: userAccount } = await supabase
    .from('user_accounts')
    .select('is_admin')
    .eq('user_id', user.userId)
    .single();

  const dbIsAdmin = userAccount?.is_admin === true || userAccount?.is_admin === 'true' || userAccount?.is_admin === 1 || userAccount?.is_admin === '1';
  console.log('[DEBUG] dbIsAdmin:', dbIsAdmin, 'user.isAdmin:', user.isAdmin);

  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('request_role, request_branch')
    .eq('user_id', user.userId);

  const roleSet = new Set(
    permissions?.filter(p => p.request_branch?.toLowerCase() === 'advances').map(p => p.request_role) || []
  );
  let effectiveRole: EffectiveRole | null = null;

  // Check both JWT isAdmin and database is_admin
  if (user.isAdmin || dbIsAdmin) {
    effectiveRole = 'admin';
  } else if (roleSet.has('accounting')) {
    effectiveRole = 'accounting';
  } else if (roleSet.has('approver')) {
    effectiveRole = 'approver';
  } else if (roleSet.has('requestor')) {
    effectiveRole = 'requestor';
  }

  console.log('[DEBUG] effectiveRole:', effectiveRole, 'roleSet:', Array.from(roleSet));

  if (!effectiveRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { toStatus } = body as { toStatus: RequestStatusType };

  // Fetch current request status and history
  const { data: currentRequest, error: fetchError } = await supabase
    .from('other_requests')
    .select('status, history')
    .eq('request_id', decodeURIComponent(id))
    .single();

  if (fetchError || !currentRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Normalize status from database (may be uppercase) to lowercase
  const currentStatus = (currentRequest.status as string).toLowerCase() as RequestStatusType;

  // Fetch breakdowns to derive breakdownsSummary
  const { data: breakdowns } = await supabase
    .from('breakdowns')
    .select('status')
    .eq('request_id', decodeURIComponent(id));

  const hasApprovedOrRejected = (breakdowns ?? []).some(
    (b: { status: string }) => b.status === 'Approved' || b.status === 'Rejected'
  );

  const permittedTransitions = getPermittedTransitions(
    effectiveRole,
    currentStatus,
    { hasApprovedOrRejected }
  );

  console.log('[Status API] effectiveRole:', effectiveRole, 'currentStatus:', currentStatus, 'permittedTransitions:', permittedTransitions, 'toStatus:', toStatus);

  // 400 if the transition is not valid for the current status
  if (!permittedTransitions.includes(toStatus)) {
    // Distinguish between "role can never do this" vs "invalid for current status"
    // Check if any role could do this transition from current status
    const allRoles: EffectiveRole[] = ['requestor', 'approver', 'accounting', 'admin'];
    const anyRolePermits = allRoles.some((r) =>
      getPermittedTransitions(r, currentStatus, { hasApprovedOrRejected }).includes(toStatus)
    );

    if (!anyRolePermits) {
      return NextResponse.json(
        { error: `Transition to '${toStatus}' is not valid from '${currentStatus}'` },
        { status: 400 }
      );
    }

    // The transition is valid in principle but not for this role
    return NextResponse.json(
      { error: 'Forbidden: your role is not permitted to make this transition' },
      { status: 403 }
    );
  }

  // Build history entry
  const historyEntry: HistoryEntry = {
    action: 'Status Changed',
    user: user.name,
    timestamp: new Date().toISOString(),
    from_status: currentStatus,
    to_status: toStatus,
  };

  const currentHistory = Array.isArray(currentRequest.history) ? currentRequest.history : [];
  const updatedHistory = [...currentHistory, historyEntry];

  // Atomic update: status + history
  const { error: updateError } = await supabase
    .from('other_requests')
    .update({
      status: toStatus,
      history: updatedHistory,
    })
    .eq('request_id', decodeURIComponent(id));

  if (updateError) {
    console.error('Error updating request status:', updateError);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
