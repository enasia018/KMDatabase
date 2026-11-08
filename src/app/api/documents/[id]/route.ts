import { NextResponse } from 'next/server';
import { deleteDocument } from '@/lib/db';
import { authorizeApiRequest, EDITOR_ROLES } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeApiRequest(request, EDITOR_ROLES);
  if (authorization.response) return authorization.response;
  try {
    const { id } = await params;
    const memberId = new URL(request.url).searchParams.get('member_id');
    if (!memberId) {
      return NextResponse.json({ error: 'A member_id is required to delete a document.' }, { status: 400 });
    }
    const deleted = await deleteDocument(id, memberId);
    if (!deleted) return NextResponse.json({ error: 'Document not found for this member' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Could not delete document:', error);
    return NextResponse.json({ error: 'Could not delete document' }, { status: 500 });
  }
}
