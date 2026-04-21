// app/api/requests/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { message } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Derive role from permissions
  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('request_role')
    .eq('user_id', user.userId);

  const roleSet = new Set(permissions?.map(p => p.request_role) || []);
  let derivedRole = 'requestor';
  if (roleSet.has('accounting')) derivedRole = 'accounting';
  else if (roleSet.has('approver')) derivedRole = 'approver';
  else if (roleSet.has('requestor')) derivedRole = 'requestor';

  // Fetch sender's profile_url for avatar
  const { data: senderProfile } = await supabase
    .from('user_accounts')
    .select('profile_url, first_name, last_name')
    .eq('user_id', user.userId)
    .single();

  const senderName = senderProfile 
    ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() 
    : user.name;

  // Fetch current message_trail
  const { data: currentRequest, error: fetchError } = await supabase
    .from('other_requests')
    .select('message_trail, requestor_id')
    .eq('request_id', decodeURIComponent(id))
    .single();

  if (fetchError || !currentRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const currentTrail = Array.isArray(currentRequest.message_trail)
    ? currentRequest.message_trail
    : [];

  // Determine receiver (the other party)
  const isRequestor = user.userId === currentRequest.requestor_id;

  const newMessage = {
    id: `msg-${Date.now()}`,
    message: message.trim(),
    sender_id: user.userId,
    sender_name: senderName || 'Unknown',
    sender_role: derivedRole,
    sender_avatar: senderProfile?.profile_url || null,
    is_requestor: isRequestor,
    timestamp: new Date().toISOString(),
    status: 'sent', // sent, delivered, read
  };

  const updatedTrail = [...currentTrail, newMessage];

  // Update the message_trail
  const { error: updateError } = await supabase
    .from('other_requests')
    .update({
      message_trail: updatedTrail,
      updated_at: new Date().toISOString(),
    })
    .eq('request_id', decodeURIComponent(id));

  if (updateError) {
    console.error('Error updating message trail:', updateError);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
}
