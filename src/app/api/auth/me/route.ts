import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Could not validate current session:', error);
    return NextResponse.json({ error: 'Authentication service is temporarily unavailable.' }, { status: 503 });
  }
}
