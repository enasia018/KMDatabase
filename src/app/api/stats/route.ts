import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/db';
import { authorizeApiRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(request);
  if (authorization.response) return authorization.response;
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
