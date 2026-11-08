import { NextResponse } from 'next/server';
import { getPayments, createPayment } from '@/lib/db';
import { authorizeApiRequest, EDITOR_ROLES } from '@/lib/auth';

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(request);
  if (authorization.response) return authorization.response;
  try {
    const payments = await getPayments();
    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(request, EDITOR_ROLES);
  if (authorization.response) return authorization.response;
  try {
    const body = await request.json();
    if (!body.member_id || !body.payment_type || !body.amount || !body.payment_date) {
      return NextResponse.json(
        { error: 'Member, payment type, amount, and payment date are required' },
        { status: 400 }
      );
    }
    const created = await createPayment(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
