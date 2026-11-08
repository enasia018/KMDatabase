'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Download, Plus, Search, Trash2 } from 'lucide-react';
import PaymentFormModal from '@/components/PaymentFormModal';
import { Member, Payment, PaymentType } from '@/lib/types';

const paymentTypes: PaymentType[] = [
  'Membership Fee',
  'Franchise Processing Fee',
  'Monthly Dues',
  'GPS Dues',
  'IDs',
  'Uniform',
  'Corporate Jacket',
  'T-Shirts',
  'Other',
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  async function loadData() {
    const [paymentResponse, memberResponse] = await Promise.all([
      fetch('/api/payments'),
      fetch('/api/members'),
    ]);
    if (!paymentResponse.ok || !memberResponse.ok) throw new Error('Could not load payment records');
    const [paymentData, memberData] = await Promise.all([
      paymentResponse.json(),
      memberResponse.json(),
    ]);
    setPayments(paymentData);
    setMembers(memberData);
    setSelectedMemberId((current) => current || memberData[0]?.id || '');
  }

  useEffect(() => {
    loadData()
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, []);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesSearch =
        !query ||
        payment.member_name?.toLowerCase().includes(query) ||
        payment.payment_type.toLowerCase().includes(query) ||
        payment.notes?.toLowerCase().includes(query);
      return matchesSearch &&
        (typeFilter === 'All' || payment.payment_type === typeFilter) &&
        (statusFilter === 'All' || payment.status === statusFilter);
    });
  }, [payments, search, typeFilter, statusFilter]);

  const totalPaid = filteredPayments
    .filter((payment) => payment.status === 'Paid')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  async function deletePayment(payment: Payment) {
    if (!confirm(`Delete the ${payment.payment_type} payment record?`)) return;
    const response = await fetch(`/api/payments/${payment.id}`, { method: 'DELETE' });
    if (!response.ok) {
      alert('Could not delete payment record');
      return;
    }
    setPayments((current) => current.filter((item) => item.id !== payment.id));
  }

  function exportCsv() {
    const rows = [
      ['Member', 'Payment type', 'Date', 'Amount (PHP)', 'Status', 'Notes'],
      ...filteredPayments.map((payment) => [
        payment.member_name || '',
        payment.payment_type,
        payment.payment_date,
        String(payment.amount),
        payment.status,
        payment.notes || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `KM_Transport_Payments_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Records</h1>
          <p className="text-sm text-slate-500">Membership, franchise processing, monthly dues, GPS dues, and other payments</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            aria-label="Select member for payment"
          >
            <option value="">Select member</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
          </select>
          <button
            disabled={!selectedMemberId}
            onClick={() => setPaymentModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </button>
          <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Filtered payments</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{filteredPayments.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Paid total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">₱{totalPaid.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Pending records</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{filteredPayments.filter((payment) => payment.status !== 'Paid').length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member, payment type, or notes" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500" />
        </label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="All">All payment types</option>
          {paymentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="All">All statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">Loading payments…</p>
        ) : filteredPayments.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No matching payments.</p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Payment type</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3"><Link href={`/members/${payment.member_id}`} className="font-medium text-sky-700 hover:underline">{payment.member_name || 'Member'}</Link></td>
                  <td className="px-4 py-3 font-medium text-slate-800">{payment.payment_type}{payment.notes && <p className="text-xs font-normal text-slate-500">{payment.notes}</p>}</td>
                  <td className="px-4 py-3 text-slate-600">{payment.payment_date}</td>
                  <td className="px-4 py-3 font-semibold">₱{Number(payment.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{payment.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deletePayment(payment)} aria-label={`Delete ${payment.payment_type} payment`} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedMemberId && (
        <PaymentFormModal
          memberId={selectedMemberId}
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
