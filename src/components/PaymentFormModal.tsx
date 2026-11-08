'use client';

import { useState } from 'react';
import { CreditCard, Save, X } from 'lucide-react';
import { PaymentStatus, PaymentType } from '@/lib/types';

interface PaymentFormModalProps {
  memberId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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

export default function PaymentFormModal({
  memberId,
  isOpen,
  onClose,
  onSuccess,
}: PaymentFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('Monthly Dues');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<PaymentStatus>('Paid');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          payment_type: paymentType,
          payment_method: 'Other',
          amount: Number(amount),
          payment_date: paymentDate,
          status,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save payment');
      setPaymentType('Monthly Dues');
      setAmount('');
      setStatus('Paid');
      setNotes('');
      onSuccess();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not save payment');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <CreditCard className="h-4 w-4 text-emerald-600" /> Record Payment
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <label className="block text-sm font-medium text-slate-700">
            Payment type
            <select value={paymentType} onChange={(event) => setPaymentType(event.target.value as PaymentType)} className={inputClass}>
              {paymentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Amount (PHP)
              <input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Payment date
              <input required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus)} className={inputClass}>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} placeholder="Details for IDs, uniforms, jackets, or T-shirts" />
          </label>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
