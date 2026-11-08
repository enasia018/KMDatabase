import { NextResponse } from 'next/server';
import { getMemberById, getMemberDocuments } from '@/lib/db';
import { authorizeApiRequest, EDITOR_ROLES } from '@/lib/auth';

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(request);
  if (authorization.response) return authorization.response;
  try {
    const memberId = new URL(request.url).searchParams.get('member_id');
    if (!memberId) {
      return NextResponse.json({ error: 'A member_id is required to list documents.' }, { status: 400 });
    }
    if (!await getMemberById(memberId)) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json(await getMemberDocuments(memberId));
  } catch (error) {
    console.error('Could not load documents:', error);
    return NextResponse.json({ error: 'Could not load documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(request, EDITOR_ROLES);
  if (authorization.response) return authorization.response;
  return NextResponse.json(
    { error: 'Use the member-specific document upload route.' },
    { status: 410 }
  );
}
