import { NextResponse } from 'next/server';
import { getUnits, createUnit } from '@/lib/db';

export async function GET() {
  try {
    const units = await getUnits();
    return NextResponse.json(units);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.member_id || !body.unit_name || !body.plate_number) {
      return NextResponse.json(
        { error: 'Member, Unit Name, and Plate Number are required' },
        { status: 400 }
      );
    }
    const created = await createUnit(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
