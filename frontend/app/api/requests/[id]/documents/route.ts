import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('request_documents')
    .select('*')
    .eq('request_id', decodeURIComponent(id))
    .order('uploaded_at', { ascending: true });

  if (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const requestId = decodeURIComponent(id);

  const formData = await request.formData();
  const name = (formData.get('name') as string | null) ?? '';
  const file = formData.get('file') as File | null;

  if (!name.trim()) {
    return NextResponse.json({ error: 'Document name is required' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const document_id = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const storagePath = `${requestId}/${document_id}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('request-documents')
    .upload(storagePath, file);

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from('request-documents')
    .getPublicUrl(storagePath);

  const file_url = urlData.publicUrl;

  const { data, error: insertError } = await supabase
    .from('request_documents')
    .insert({
      document_id,
      request_id: requestId,
      name: name.trim(),
      filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: storagePath,
      file_url,
      uploaded_by: user.name,
      uploaded_by_id: user.userId,
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting document record:', insertError);
    return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
