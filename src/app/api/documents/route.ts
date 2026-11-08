import { NextResponse } from 'next/server';
import { getMemberById, getMemberDocuments } from '@/lib/db';

export async function GET(request: Request) {
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

export async function POST() {
  return NextResponse.json(
    { error: 'Use the member-specific document upload route.' },
    { status: 410 }
  );
}
