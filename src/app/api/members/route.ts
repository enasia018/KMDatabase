import { NextResponse } from 'next/server';
import { getMembers, createMember } from '@/lib/db';

export async function GET() {
  try {
    const members = await getMembers();
    return NextResponse.json(members);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.full_name || typeof body.full_name !== 'string' || !body.full_name.trim()) {
      return NextResponse.json(
        { error: 'Member name is required' },
        { status: 400 }
      );
    }
    const created = await createMember(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
