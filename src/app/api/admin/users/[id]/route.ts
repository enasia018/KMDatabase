import { NextResponse } from 'next/server';
import { updateAuthUser } from '@/lib/db';
import type { AppRole } from '@/lib/auth-policy';
import { authorizeApiRequest, isValidPassword } from '@/lib/auth';
import { hashPassword } from '@/lib/auth-crypto';

const roles: AppRole[] = ['Administrator', 'Editor', 'Viewer'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeApiRequest(request, ['Administrator']);
  if (authorization.response) return authorization.response;

  let body: { role?: unknown; is_active?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid account update.' }, { status: 400 });
  }
  const updates: { role?: AppRole; is_active?: boolean; password_hash?: string } = {};
  if (body.role !== undefined) {
    if (typeof body.role !== 'string' || !roles.includes(body.role as AppRole)) {
      return NextResponse.json({ error: 'Choose Administrator, Editor, or Viewer.' }, { status: 400 });
    }
    updates.role = body.role as AppRole;
  }
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be true or false.' }, { status: 400 });
    }
    updates.is_active = body.is_active;
  }
  if (body.password !== undefined) {
    if (typeof body.password !== 'string' || !isValidPassword(body.password)) {
      return NextResponse.json({ error: 'Password must be 12 to 128 characters.' }, { status: 400 });
    }
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Provide a role, active state, or password to update.' }, { status: 400 });
  }

  try {
    const { id } = await params;
    if (typeof body.password === 'string') {
      updates.password_hash = await hashPassword(body.password);
    }
    const user = await updateAuthUser(id, updates);
    if (!user) {
      return NextResponse.json({ error: 'Account was not found or the last active Administrator cannot be removed.' }, { status: 409 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message.includes('At least one active Administrator')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Could not update account:', error);
    return NextResponse.json({ error: 'Could not update account.' }, { status: 503 });
  }
}
