import { NextResponse } from 'next/server';
import { deleteDocument, getMemberDocument } from '@/lib/db';
import { authorizeApiRequest, EDITOR_ROLES } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string; documentId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const authorization = await authorizeApiRequest(request);
  if (authorization.response) return authorization.response;
  try {
    const { id, documentId } = await params;
    const document = await getMemberDocument(id, documentId);
    if (!document) return NextResponse.json({ error: 'Document not found for this member' }, { status: 404 });
    if (!document.file_data) {
      return NextResponse.json({ error: 'The saved document file is unavailable' }, { status: 404 });
    }

    const separator = document.file_data.indexOf(',');
    if (separator < 0) {
      return NextResponse.json({ error: 'The saved document file is invalid' }, { status: 500 });
    }
    const bytes = Buffer.from(document.file_data.slice(separator + 1), 'base64');
    const inline = new URL(request.url).searchParams.get('inline') === '1';
    const canInline = document.file_type === 'application/pdf' || document.file_type.startsWith('image/');
    const disposition = inline && canInline ? 'inline' : 'attachment';
    const safeName = document.file_name.replace(/["\\\r\n]/g, '_');

    return new Response(bytes, {
      headers: {
        'Content-Type': document.file_type,
        'Content-Length': String(bytes.length),
        'Content-Disposition': `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Could not read member document:', error);
    return NextResponse.json({ error: 'Could not read member document' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorization = await authorizeApiRequest(_request, EDITOR_ROLES);
  if (authorization.response) return authorization.response;
  try {
    const { id, documentId } = await params;
    const deleted = await deleteDocument(documentId, id);
    if (!deleted) return NextResponse.json({ error: 'Document not found for this member' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Could not delete member document:', error);
    return NextResponse.json({ error: 'Could not delete member document' }, { status: 500 });
  }
}
