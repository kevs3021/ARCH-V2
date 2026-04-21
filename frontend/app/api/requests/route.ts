// app/api/requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';

function getRequestTypePrefix(requestType: string): string {
  const typeMap: Record<string, string> = {
    'Advanced Request': 'A',
    'For Reimbursement': 'R',
    'Direct Expense': 'D',
    'Credit Card': 'C',
    'Repairs and Maintenance': 'M',
    'Rental Expenses': 'E',
  };
  return typeMap[requestType] || 'R';
}

async function generateRequestId(supabase: Awaited<ReturnType<typeof createClient>>, branch: string | null): Promise<string> {
  const requestTypePrefix = 'A';
  
  let branchDocClass = 'X';
  
  if (branch) {
    const { data: branchData } = await supabase
      .from('branches')
      .select('branch_doc_class')
      .eq('branch', branch)
      .limit(1);
    
    if (branchData && branchData.length > 0) {
      branchDocClass = branchData[0].branch_doc_class || 'X';
    }
  }
  
  const { data: allRequests } = await supabase
    .from('other_requests')
    .select('request_id');
  
  const count = allRequests?.length ?? 0;
  const requestNumber = count + 1;
  
  return `${requestTypePrefix}${branchDocClass}-${requestNumber}`;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const {
    request_title,
    amount,
    request_type,
    company,
    branch,
    campaign,
    date_needed,
    remarks,
    payment_first,
  } = body;

  if (!request_title) {
    return NextResponse.json({ error: 'Request title is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const request_id = await generateRequestId(supabase, branch);

  const { data, error } = await supabase
    .from('other_requests')
    .insert({
      request_id,
      requestor_id: user.userId,
      request_title,
      amount: amount || null,
      request_type: request_type || 'advance_request',
      status: 'OPEN',
      company: company || null,
      branch: branch || null,
      campaign: campaign || null,
      date_needed: date_needed || null,
      remarks: remarks || null,
      payment_first: payment_first || false,
      document_status: 'Pending',
      message_trail: [],
      history: [
        {
          action: 'Created',
          user: user.name,
          timestamp: new Date().toISOString(),
        },
      ],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
