// app/api/liquidations/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookie } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import sharp from 'sharp';

const SUPABASE_BUCKET = 'liquidations';
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function getFileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

function isImage(type: string): boolean {
  return type.startsWith('image/');
}

function isPdf(type: string): boolean {
  return type === 'application/pdf';
}

function isWord(type: string): boolean {
  return type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

// Convert image buffer to PDF buffer using sharp + pdf-lib
async function imageToPdf(buffer: Buffer, mime: string): Promise<Buffer> {
  // Normalize image to PNG via sharp
  const pngBuffer = await sharp(buffer).png().toBuffer();
  const metadata = await sharp(pngBuffer).metadata();
  const imgWidth = metadata.width || 595;
  const imgHeight = metadata.height || 842;

  const pdfDoc = await PDFDocument.create();
  // Scale to fit A4-ish page while maintaining aspect ratio
  const maxWidth = 595;
  const maxHeight = 842;
  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
  const page = pdfDoc.addPage([imgWidth * scale, imgHeight * scale]);

  const pngImage = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(pngImage, { x: 0, y: 0, width: imgWidth * scale, height: imgHeight * scale });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Convert Word buffer to PDF buffer via HTML then pdf-lib placeholder
async function wordToPdf(buffer: Buffer): Promise<Buffer> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  // Extract text content from HTML for the PDF page
  const textContent = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const pdfDoc = await PDFDocument.create();
  const fontSize = 11;
  const margin = 50;
  const pageWidth = 595;
  const pageHeight = 842;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * 1.5;

  // Simple word wrap
  const words = textContent.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Approximate character width
    if (testLine.length * (fontSize * 0.5) > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Paginate
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (let i = 0; i < lines.length; i++) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(lines[i], {
      x: margin,
      y: y - fontSize,
      size: fontSize,
      maxWidth,
    });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Merge multiple PDFs
async function mergePdfs(buffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const pdfBytes = await merged.save();
  return Buffer.from(pdfBytes);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const requestId = formData.get('request_id') as string;
  const particulars = formData.get('particulars') as string;
  const amount = formData.get('amount') as string;
  const vendor = formData.get('vendor') as string;
  const orNumber = formData.get('or_number') as string;
  const orDate = formData.get('or_date') as string;
  const remarks = formData.get('remarks') as string;
  // File order comes as comma-separated indices
  const fileOrder = (formData.get('file_order') as string || '')
    .split(',')
    .filter(Boolean)
    .map(Number);

  if (!requestId || !particulars) {
    return NextResponse.json({ error: 'Request ID and particulars are required' }, { status: 400 });
  }

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
  }

  // Validate files
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.name}` }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 });
    }
  }

  // Reorder files if order is provided
  let orderedFiles = files;
  if (fileOrder.length === files.length) {
    orderedFiles = fileOrder.map((i) => files[i]);
  }

  const supabase = await createClient();

  try {
    let attachmentUrl = '';
    const timestamp = Date.now();

    if (orderedFiles.length === 1) {
      // Single file — upload directly
      const file = orderedFiles[0];
      const safeName = requestId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const path = `${safeName}/${timestamp}_${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', JSON.stringify(uploadError, null, 2));
        return NextResponse.json({ error: `Failed to upload: ${uploadError.message}` }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
      attachmentUrl = urlData.publicUrl;
    } else {
      // Multiple files — convert each to PDF then merge
      const pdfBuffers: Buffer[] = [];

      for (const file of orderedFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());

        try {
          if (isPdf(file.type)) {
            // Validate PDF by loading it
            await PDFDocument.load(buffer);
            pdfBuffers.push(buffer);
          } else if (isImage(file.type)) {
            pdfBuffers.push(await imageToPdf(buffer, file.type));
          } else if (isWord(file.type)) {
            pdfBuffers.push(await wordToPdf(buffer));
          }
        } catch (convErr) {
          console.error(`Failed to convert file ${file.name}:`, convErr);
          return NextResponse.json({ error: `Failed to process file: ${file.name}` }, { status: 500 });
        }
      }

      let mergedPdf: Buffer;
      try {
        mergedPdf = await mergePdfs(pdfBuffers);
      } catch (mergeErr) {
        console.error('PDF merge error:', mergeErr);
        return NextResponse.json({ error: 'Failed to merge PDF files' }, { status: 500 });
      }

      const safeName = requestId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const path = `${safeName}/${timestamp}_merged.pdf`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(path, mergedPdf, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', JSON.stringify(uploadError, null, 2));
        return NextResponse.json({ error: `Failed to upload: ${uploadError.message}` }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
      attachmentUrl = urlData.publicUrl;
    }

    // Insert liquidation record
    const liquidationId = `LIQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const { data: liquidation, error: insertError } = await supabase
      .from('others_liquidations')
      .insert({
        liquidation_id: liquidationId,
        request_id: requestId,
        submitted_by: user.userId,
        particulars,
        amount: amount ? parseFloat(amount) : null,
        vendor: vendor || null,
        or_number: orNumber || null,
        or_date: orDate || null,
        remarks: remarks || null,
        attachment_url: attachmentUrl,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create liquidation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: liquidation }, { status: 201 });
  } catch (error) {
    console.error('Liquidation creation error:', error);
    return NextResponse.json({ error: 'Failed to process files' }, { status: 500 });
  }
}
