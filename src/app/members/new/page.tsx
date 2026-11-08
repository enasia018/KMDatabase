'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { useAuthUser } from '@/lib/use-auth-user';

export default function NewMemberPage() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState({
    full_name: '',
    id_number: '',
    authorized_driver_ids: '',
  });
  const [vehicle, setVehicle] = useState({
    plate_number: '',
    engine_number: '',
    chassis_number: '',
    mv_file_number: '',
    franchise_case_number: '',
    pami_renewal_date: '',
    lto_registration_renewal_date: '',
  });

  useEffect(() => {
    if (role === 'Viewer') router.replace('/members');
  }, [role, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const memberResponse = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
      const memberData = await memberResponse.json();
      if (!memberResponse.ok) {
        throw new Error(memberData.error || 'Could not save member');
      }

      const vehicleResponse = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vehicle,
          member_id: memberData.id,
          unit_name: 'Vehicle',
          status: 'Active',
        }),
      });
      const vehicleData = await vehicleResponse.json();
      if (!vehicleResponse.ok) {
        throw new Error(vehicleData.error || 'Member saved, but vehicle details could not be saved');
      }

      router.push(`/members/${memberData.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save the record');
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500';

  if (authLoading || !role || role === 'Viewer') {
    return <p className="p-10 text-center text-sm text-slate-500">Checking access…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/members" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Member and Vehicle</h1>
          <p className="text-sm text-slate-500">Enter member, vehicle, and renewal records.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Member</h2>
          <label className="block text-sm font-medium text-slate-700">
            Name *
            <input
              required
              value={member.full_name}
              onChange={(event) => setMember({ ...member, full_name: event.target.value })}
              className={`${inputClass} mt-1`}
              autoComplete="name"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            ID Number
            <input
              value={member.id_number}
              onChange={(event) => setMember({ ...member, id_number: event.target.value })}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Other IDs (authorized drivers)
            <textarea
              rows={3}
              value={member.authorized_driver_ids}
              onChange={(event) => setMember({ ...member, authorized_driver_ids: event.target.value })}
              className={`${inputClass} mt-1`}
              placeholder="Enter authorized driver names and ID numbers"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Vehicle and renewals</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['plate_number', 'Plate Number *'],
              ['engine_number', 'Engine Number'],
              ['chassis_number', 'Chassis Number'],
              ['mv_file_number', 'MV File Number'],
              ['franchise_case_number', 'Case Number'],
            ] as const).map(([field, label]) => (
              <label key={field} className="block text-sm font-medium text-slate-700">
                {label}
                <input
                  required={field === 'plate_number'}
                  value={vehicle[field]}
                  onChange={(event) => setVehicle({ ...vehicle, [field]: event.target.value })}
                  className={`${inputClass} mt-1`}
                />
              </label>
            ))}
            <label className="block text-sm font-medium text-slate-700">
              PAMI Renewal Date
              <input
                type="date"
                value={vehicle.pami_renewal_date}
                onChange={(event) => setVehicle({ ...vehicle, pami_renewal_date: event.target.value })}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              LTO Registration Renewal
              <input
                type="date"
                value={vehicle.lto_registration_renewal_date}
                onChange={(event) => setVehicle({ ...vehicle, lto_registration_renewal_date: event.target.value })}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link href="/members" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving…' : 'Save Member'}
          </button>
        </div>
      </form>
    </div>
  );
}
