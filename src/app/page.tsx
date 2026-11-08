'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Car, CreditCard, Plus, Users } from 'lucide-react';
import { DashboardStats, Member, Payment } from '@/lib/types';
import { useAuthUser } from '@/lib/use-auth-user';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

type Renewal = {
  memberId: string;
  memberName: string;
  plate: string;
  kind: string;
  date: string;
};

export default function DashboardPage() {
  const { role } = useAuthUser();
  const canEdit = role === 'Administrator' || role === 'Editor';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const [statsResponse, membersResponse, paymentsResponse] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/members'),
      fetch('/api/payments'),
    ]);
    if (statsResponse.ok) setStats(await statsResponse.json());
    if (membersResponse.ok) setMembers(await membersResponse.json());
    if (paymentsResponse.ok) setPayments(await paymentsResponse.json());
    if (!statsResponse.ok || !membersResponse.ok || !paymentsResponse.ok) {
      throw new Error('Could not load dashboard records');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard().catch((error) => {
      console.error('Could not load dashboard records:', error);
      setLoading(false);
    });
  }, [loadDashboard]);
  useAutoRefresh(loadDashboard);

  const renewals: Renewal[] = members.flatMap((member) =>
    (member.units || []).flatMap((unit) => [
      ...(unit.pami_renewal_date ? [{
        memberId: member.id,
        memberName: member.full_name,
        plate: unit.plate_number,
        kind: 'PAMI',
        date: unit.pami_renewal_date,
      }] : []),
      ...(unit.lto_registration_renewal_date ? [{
        memberId: member.id,
        memberName: member.full_name,
        plate: unit.plate_number,
        kind: 'LTO registration',
        date: unit.lto_registration_renewal_date,
      }] : []),
    ])
  ).filter((renewal) => {
    const date = new Date(`${renewal.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 45);
    return date >= today && date <= limit;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const cards = [
    { label: 'Members', value: stats?.totalMembers ?? 0, icon: Users, color: 'text-sky-700 bg-sky-50' },
    { label: 'Vehicles', value: stats?.totalUnits ?? 0, icon: Car, color: 'text-indigo-700 bg-indigo-50' },
    { label: 'Collected this month', value: `₱${(stats?.totalCollectedThisMonth ?? 0).toLocaleString()}`, icon: CreditCard, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Renewals in 45 days', value: stats?.upcomingRenewalsCount ?? 0, icon: CalendarClock, color: 'text-amber-700 bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Member and Vehicle Records</h1>
          <p className="text-sm text-slate-500">IDs, vehicle details, renewals, and dues in one place.</p>
        </div>
        <div className="flex gap-2">
          {canEdit && <Link href="/members/new" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Add Member
          </Link>}
          <Link href="/payments" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            <CreditCard className="h-4 w-4" /> Payments
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
              <span className={`rounded-lg p-2 ${color}`}><Icon className="h-5 w-5" /></span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{loading ? '…' : value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Upcoming renewals</h2>
            <p className="text-xs text-slate-500">PAMI and LTO dates in the next 45 days</p>
          </div>
          {renewals.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No renewals due in the next 45 days.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {renewals.map((renewal) => (
                <li key={`${renewal.memberId}-${renewal.plate}-${renewal.kind}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <Link href={`/members/${renewal.memberId}`} className="text-sm font-semibold text-slate-800 hover:text-sky-700">{renewal.memberName}</Link>
                    <p className="text-xs text-slate-500">{renewal.plate} · {renewal.kind}</p>
                  </div>
                  <time className="whitespace-nowrap text-xs font-medium text-slate-600">{renewal.date}</time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent payments</h2>
            <p className="text-xs text-slate-500">Monthly dues, membership, processing, GPS, and other payments</p>
          </div>
          {payments.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No payments recorded.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.slice(0, 6).map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{payment.payment_type}</p>
                    <p className="text-xs text-slate-500">{payment.member_name || 'Member'} · {payment.payment_date}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-slate-800">₱{Number(payment.amount).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
