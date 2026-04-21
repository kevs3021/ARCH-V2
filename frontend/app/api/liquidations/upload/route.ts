import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookie } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Allowed file types for liquidations
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Upload directory
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'liquidations');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Process file and merge if needed
async function processFile(file: File, userId: string): Promise<{
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
}> {
  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of 10MB`);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'pdf';
  const filename = `${userId}_${timestamp}.${ext}`;
  const filePath = join(UPLOAD_DIR, filename);

  // Save file
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    filename,
    originalName: file.name,
    fileType: file.type,
    fileSize: file.size,
    filePath: `/uploads/liquidations/${filename}`,
  };
}

// Upload liquidation files
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getCurrentUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const requestId = formData.get('request_id') as string;
    const notes = formData.get('notes') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Process each file
    const processedFiles = await Promise.all(
      files.map(file => processFile(file, user.userId))
    );

    // Create Supabase client
    const supabase = await createServerClient();

    // Save file records to database
    const fileRecords = processedFiles.map(file => ({
      liquidation_id: null, // Will be linked after creating liquidation
      filename: file.filename,
      original_name: file.originalName,
      file_type: file.fileType,
      file_size: file.fileSize,
      file_path: file.filePath,
      uploaded_by: user.userId,
    }));

    // Insert file records
    const { data: insertedFiles, error: insertError } = await supabase
      .from('liquidation_attachments')
      .insert(fileRecords)
      .select();

    if (insertError) {
      console.error('Failed to save file records:', insertError);
      return NextResponse.json(
        { error: 'Failed to save file records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files: insertedFiles,
      message: `Successfully uploaded ${files.length} file(s)`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// Get uploaded files for a liquidation
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const liquidationId = searchParams.get('liquidation_id');
    const requestId = searchParams.get('request_id');

    const supabase = await createServerClient();

    let query = supabase
      .from('liquidation_attachments')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (liquidationId) {
      query = query.eq('liquidation_id', liquidationId);
    } else if (requestId) {
      // Get attachments through liquidation
      const { data: liquidations } = await supabase
        .from('liquidations')
        .select('id')
        .eq('request_id', requestId);

      if (liquidations && liquidations.length > 0) {
        query = query.in('liquidation_id', liquidations.map(l => l.id));
      }
    }

    const { data: attachments, error } = await query;

    if (error) {
      console.error('Failed to fetch attachments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attachments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attachments: attachments || [],
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}