import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getAuthUserByEmail } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth-crypto';
import {
  createLoginSession,
  isSetupRequired,
  isValidLoginIdentifier,
  normalizeLoginIdentifier,
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS,
} from '@/lib/auth';

const dummyPasswordHash = hashPassword(randomBytes(32).toString('hex'));

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid login request.' }, { status: 400 });
  }
  if (typeof body.email !== 'string' || typeof body.password !== 'string' ||
      body.password.length > 128) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }

  const email = normalizeLoginIdentifier(body.email);
  if (!isValidLoginIdentifier(email)) return NextResponse.json({ error: 'Username/email or password is incorrect.' }, { status: 401 });

  try {
    if (await isSetupRequired()) {
      return NextResponse.json({ error: 'Complete first-administrator setup at /setup before signing in.' }, { status: 409 });
    }
    const user = await getAuthUserByEmail(email);
    const encodedHash = user?.password_hash || await dummyPasswordHash;
    const passwordMatches = await verifyPassword(body.password, encodedHash);
    if (!user || !user.is_active || !passwordMatches) {
      return NextResponse.json({ error: 'Username/email or password is incorrect.' }, { status: 401 });
    }

    const token = await createLoginSession(user);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('Could not authenticate user:', error);
    return NextResponse.json({ error: 'Authentication service is temporarily unavailable.' }, { status: 503 });
  }
}
