'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Member } from '@/lib/types';
import { useAuthUser } from '@/lib/use-auth-user';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

function MembersContent() {
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(true);
  const { role } = useAuthUser();
  const canEdit = role === 'Administrator' || role === 'Editor';

  const loadMembers = useCallback(async () => {
    const response = await fetch('/api/members');
    if (!response.ok) throw new Error('Could not load member records');
    setMembers(await response.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [loadMembers]);
  useAutoRefresh(loadMembers);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const vehicleValues = (member.units || []).flatMap((unit) => [
        unit.plate_number,
        unit.engine_number,
        unit.chassis_number,
        unit.mv_file_number,
        unit.franchise_case_number,
        unit.pami_renewal_date,
        unit.lto_registration_renewal_date,
      ]);
      return [
        member.full_name,
        member.id_number,
        member.authorized_driver_ids,
        ...(member.documents || []).flatMap((document) => [
          document.title,
          document.file_name,
          document.category,
        ]),
        ...vehicleValues,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [members, search]);

  async function deleteMember(member: Member) {
    if (!confirm(`Delete the record for ${member.full_name}?`)) return;
    const response = await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
    if (!response.ok) {
      alert('Could not delete the member record.');
      return;
    }
    setMembers((current) => current.filter((item) => item.id !== member.id));
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Members and Vehicles</h1>
          <p className="text-sm text-slate-500">Member IDs, vehicle records, and renewal dates</p>
        </div>
        {canEdit && (
          <Link href="/members/new" className="inline-flex items-center gap-2 self-start rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Add Member
          </Link>
        )}
      </header>

      <label className="relative block max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, ID, plate, engine, chassis, MV file, or case number"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
        />
      </label>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">Loading records…</p>
        ) : filteredMembers.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No matching member records.</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Member / IDs</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Renewals</th>
                <th className="px-4 py-3 text-right"> {canEdit ? 'Actions' : 'Profile'} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <Link href={`/members/${member.id}`} className="font-semibold text-slate-900 hover:text-sky-700">
                      {member.full_name}
                    </Link>
                    <p className="mt-1 text-xs text-slate-600">ID: {member.id_number || '—'}</p>
                    {member.authorized_driver_ids && (
                      <p className="mt-1 max-w-xs whitespace-pre-wrap text-xs text-slate-500">
                        Authorized drivers: {member.authorized_driver_ids}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {(member.units || []).length === 0 ? (
                      <span className="text-xs text-slate-400">No vehicle record</span>
                    ) : member.units?.map((unit) => (
                      <div key={unit.id} className="mb-2 last:mb-0">
                        <p className="font-semibold text-slate-800">{unit.plate_number}</p>
                        <p className="text-xs text-slate-500">Engine: {unit.engine_number || '—'} · Chassis: {unit.chassis_number || '—'}</p>
                        <p className="text-xs text-slate-500">MV file: {unit.mv_file_number || '—'} · Case: {unit.franchise_case_number || '—'}</p>
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    {(member.units || []).map((unit) => (
                      <div key={unit.id} className="mb-2 last:mb-0">
                        <p>PAMI: {unit.pami_renewal_date || '—'}</p>
                        <p>LTO: {unit.lto_registration_renewal_date || '—'}</p>
                      </div>
                    ))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <Link href={`/members/${member.id}`} className="mr-3 text-xs font-semibold text-sky-700 hover:underline">Open</Link>
                    {canEdit && (
                      <button onClick={() => deleteMember(member)} aria-label={`Delete ${member.full_name}`} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="inline h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">Loading records…</div>}>
      <MembersContent />
    </Suspense>
  );
}
