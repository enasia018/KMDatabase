import { NextResponse } from 'next/server';
import { isNeonConfigured, initNeonDatabase, seedOrMigrateToNeon } from '@/lib/db';

export async function GET() {
  const isNeon = isNeonConfigured();
  return NextResponse.json({
    neonConfigured: isNeon,
    mode: isNeon ? 'Neon Serverless PostgreSQL' : 'Local Storage Mode',
    databaseUrlMasked: isNeon
      ? process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@')
      : null,
  });
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'init') {
      const result = await initNeonDatabase();
      return NextResponse.json(result);
    }

    if (action === 'migrate_seed') {
      const result = await seedOrMigrateToNeon();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
