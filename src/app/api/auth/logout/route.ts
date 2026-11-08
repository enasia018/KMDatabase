import { NextResponse } from 'next/server';
import { revokeRequestSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await revokeRequestSession(request);
  } catch (error) {
    console.error('Could not revoke session:', error);
    const response = NextResponse.json({ error: 'Could not sign out safely.' }, { status: 503 });
    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
