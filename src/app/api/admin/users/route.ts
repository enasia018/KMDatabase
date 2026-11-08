import { NextResponse } from 'next/server';
import { createAuthUser, listAuthUsers } from '@/lib/db';
import type { AppRole } from '@/lib/auth-policy';
import { authorizeApiRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/auth-crypto';
import { isValidLoginIdentifier, isValidPassword, normalizeLoginIdentifier } from '@/lib/auth';

const roles: AppRole[] = ['Administrator', 'Editor', 'Viewer'];

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(request, ['Administrator']);
  if (authorization.response) return authorization.response;
  try {
    return NextResponse.json(await listAuthUsers());
  } catch (error) {
    console.error('Could not list accounts:', error);
    return NextResponse.json({ error: 'Could not load accounts.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(request, ['Administrator']);
  if (authorization.response) return authorization.response;
  let body: { email?: unknown; password?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid account request.' }, { status: 400 });
  }
  if (typeof body.email !== 'string' || typeof body.password !== 'string' ||
      typeof body.role !== 'string') {
    return NextResponse.json({ error: 'Email, password, and role are required.' }, { status: 400 });
  }
  const email = normalizeLoginIdentifier(body.email);
  if (!isValidLoginIdentifier(email)) return NextResponse.json({ error: 'Enter a valid username or email address.' }, { status: 400 });
  if (!isValidPassword(body.password)) {
    return NextResponse.json({ error: 'Password must be 12 to 128 characters.' }, { status: 400 });
  }
  if (!roles.includes(body.role as AppRole)) {
    return NextResponse.json({ error: 'Choose Administrator, Editor, or Viewer.' }, { status: 400 });
  }
  try {
    const user = await createAuthUser(email, await hashPassword(body.password), body.role as AppRole);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const duplicate = error instanceof Error && error.message.includes('already exists');
    if (!duplicate) console.error('Could not create account:', error);
    return NextResponse.json(
      { error: duplicate ? error.message : 'Could not create account.' },
      { status: duplicate ? 409 : 503 }
    );
  }
}
