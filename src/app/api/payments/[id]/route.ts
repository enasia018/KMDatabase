import { NextResponse } from 'next/server';
import { deletePayment } from '@/lib/db';
import { authorizeApiRequest, EDITOR_ROLES } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeApiRequest(request, EDITOR_ROLES);
  if (authorization.response) return authorization.response;
  try {
    const { id } = await params;
    const ok = await deletePayment(id);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
