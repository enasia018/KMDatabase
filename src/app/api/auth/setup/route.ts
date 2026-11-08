import { NextResponse } from 'next/server';
import { createBootstrapAdmin } from '@/lib/db';
import { hashPassword } from '@/lib/auth-crypto';
import {
  isSetupRequired,
  isValidLoginIdentifier,
  isValidPassword,
  normalizeLoginIdentifier,
} from '@/lib/auth';

export async function GET() {
  try {
    return NextResponse.json({ setupRequired: await isSetupRequired() });
  } catch (error) {
    console.error('Could not inspect first-admin setup state:', error);
    return NextResponse.json({ error: 'Authentication storage is unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid setup request.' }, { status: 400 });
  }
  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Username/email and password are required.' }, { status: 400 });
  }

  const email = normalizeLoginIdentifier(body.email);
  if (!isValidLoginIdentifier(email)) {
    return NextResponse.json({ error: 'Enter a valid username or email address.' }, { status: 400 });
  }
  if (!isValidPassword(body.password)) {
    return NextResponse.json({ error: 'Password must be 12 to 128 characters.' }, { status: 400 });
  }

  try {
    const user = await createBootstrapAdmin(email, await hashPassword(body.password));
    if (!user) {
      return NextResponse.json({ error: 'First-admin setup has already been completed.' }, { status: 409 });
    }
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Could not complete first-admin setup:', error);
    return NextResponse.json({ error: 'Could not complete first-admin setup.' }, { status: 503 });
  }
}
