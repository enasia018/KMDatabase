'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Unit } from '@/lib/types';

interface UnitFormModalProps {
  memberId: string;
  initialUnit?: Unit | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type VehicleForm = Pick<
  Unit,
  | 'plate_number'
  | 'engine_number'
  | 'chassis_number'
  | 'mv_file_number'
  | 'franchise_case_number'
  | 'pami_renewal_date'
  | 'lto_registration_renewal_date'
>;

const emptyForm: VehicleForm = {
  plate_number: '',
  engine_number: '',
  chassis_number: '',
  mv_file_number: '',
  franchise_case_number: '',
  pami_renewal_date: '',
  lto_registration_renewal_date: '',
};

const fields: Array<{ key: keyof VehicleForm; label: string; date?: boolean }> = [
  { key: 'plate_number', label: 'Plate Number' },
  { key: 'engine_number', label: 'Engine Number' },
  { key: 'chassis_number', label: 'Chassis Number' },
  { key: 'mv_file_number', label: 'MV File Number' },
  { key: 'franchise_case_number', label: 'Case Number' },
  { key: 'pami_renewal_date', label: 'PAMI Renewal Date', date: true },
  { key: 'lto_registration_renewal_date', label: 'LTO Registration Renewal', date: true },
];

export default function UnitFormModal({
  memberId,
  initialUnit,
  isOpen,
  onClose,
  onSuccess,
}: UnitFormModalProps) {
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      plate_number: initialUnit?.plate_number || '',
      engine_number: initialUnit?.engine_number || '',
      chassis_number: initialUnit?.chassis_number || '',
      mv_file_number: initialUnit?.mv_file_number || '',
      franchise_case_number: initialUnit?.franchise_case_number || '',
      pami_renewal_date: initialUnit?.pami_renewal_date || '',
      lto_registration_renewal_date: initialUnit?.lto_registration_renewal_date || '',
    });
  }, [initialUnit, isOpen]);

  if (!isOpen) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(initialUnit ? `/api/units/${initialUnit.id}` : '/api/units', {
        method: initialUnit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          member_id: memberId,
          unit_name: 'Vehicle',
          status: 'Active',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save vehicle record');
      onSuccess();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not save vehicle record');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="font-semibold text-slate-900">{initialUnit ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, date }) => (
              <label key={key} className="text-sm font-medium text-slate-700">
                {label}{key === 'plate_number' ? ' *' : ''}
                <input
                  type={date ? 'date' : 'text'}
                  required={key === 'plate_number'}
                  value={form[key] || ''}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
