import { NextResponse } from 'next/server';
import { getMembers, createMember } from '@/lib/db';
import { authorizeApiRequest, EDITOR_ROLES } from '@/lib/auth';

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(request);
  if (authorization.response) return authorization.response;
  try {
    const members = await getMembers();
    return NextResponse.json(members);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(request, EDITOR_ROLES);
  if (authorization.response) return authorization.response;
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
