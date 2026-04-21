// lib/data/requests.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getRequestById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('other_requests')
    .select(`
      *,
      requestor:user_accounts (
        first_name,
        last_name
      )
    `)
    .eq('request_id', id)
    .single();

  if (error) {
    console.error('Error fetching request by ID:', JSON.stringify(error, null, 2));
    return null;
  }
  return data;
}

export async function getBreakdownsByRequestId(requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('breakdowns')
    .select(`
      *,
      breakdown_approvers (
        requestor_id,
        status,
        approved_at,
        approver:user_accounts (
          first_name,
          last_name
        )
      )
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching breakdowns:', error);
    return [];
  }
  return data;
}

export async function getLiquidationsByRequestId(requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('others_liquidations')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching liquidations:', error);
    return [];
  }
  return data;
}

export async function getDocumentsByRequestId(requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('request_documents')
    .select('*')
    .eq('request_id', requestId)
    .order('uploaded_at', { ascending: true });

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
  return data;
}

export async function getRequestDataBundle(requestId: string, userId: string, isAdmin: boolean, supabase: any) {
  const [requestData, breakdowns, liquidations] = await Promise.all([
    getRequestById(requestId),
    getBreakdownsByRequestId(requestId),
    getLiquidationsByRequestId(requestId),
  ]);
  
  return { requestData, breakdowns, liquidations };
}
