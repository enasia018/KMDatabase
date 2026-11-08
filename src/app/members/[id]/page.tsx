'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Car, CreditCard, Download, Eye, FileText, Plus, Save, Search, Trash2, Upload } from 'lucide-react';
import { DocumentAttachment, Member, Unit } from '@/lib/types';
import UnitFormModal from '@/components/UnitFormModal';
import PaymentFormModal from '@/components/PaymentFormModal';
import DocumentUploadModal from '@/components/DocumentUploadModal';
import DocumentViewerModal from '@/components/DocumentViewerModal';

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentAttachment | null>(null);
  const [documentSearch, setDocumentSearch] = useState('');
  const [form, setForm] = useState({ full_name: '', id_number: '', authorized_driver_ids: '' });

  async function loadMember() {
    const response = await fetch(`/api/members/${id}`);
    if (!response.ok) {
      setMember(null);
      setLoading(false);
      return;
    }
    const data: Member = await response.json();
    setMember(data);
    setForm({
      full_name: data.full_name || '',
      id_number: data.id_number || '',
      authorized_driver_ids: data.authorized_driver_ids || '',
    });
    setLoading(false);
  }

  useEffect(() => {
    loadMember().catch((error) => {
      console.error('Could not load member record:', error);
      setLoading(false);
    });
  }, [id]);

  async function saveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Could not update member record');
      await loadMember();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update member record');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUnit(unit: Unit) {
    if (!confirm(`Delete vehicle record for ${unit.plate_number}?`)) return;
    const response = await fetch(`/api/units/${unit.id}`, { method: 'DELETE' });
    if (!response.ok) {
      alert('Could not delete vehicle record');
      return;
    }
    await loadMember();
  }

  async function deleteMember() {
    if (!confirm(`Delete ${member?.full_name} and associated records?`)) return;
    const response = await fetch(`/api/members/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      alert('Could not delete member record');
      return;
    }
    router.push('/members');
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500';
  const filteredDocuments = (member?.documents || []).filter((document) =>
    [document.title, document.file_name, document.category, document.notes]
      .some((value) => value?.toLowerCase().includes(documentSearch.trim().toLowerCase()))
  );

  async function deleteDocument(document: DocumentAttachment) {
    if (!confirm(`Delete "${document.title}" from ${member?.full_name}'s documents?`)) return;
    try {
      const response = await fetch(
        `/api/members/${encodeURIComponent(id)}/documents/${encodeURIComponent(document.id)}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Could not delete document');
      }
      await loadMember();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete document');
    }
  }

  if (loading) return <p className="p-10 text-center text-sm text-slate-500">Loading member…</p>;
  if (!member) return <p className="p-10 text-center text-sm text-slate-500">Member record not found.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/members" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{member.full_name}</h1>
            <p className="text-sm text-slate-500">Member, vehicle, renewal, and payment records</p>
          </div>
        </div>
        <button onClick={deleteMember} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </header>

      <form onSubmit={saveMember} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Member information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Name *
            <input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            ID Number
            <input value={form.id_number} onChange={(event) => setForm({ ...form, id_number: event.target.value })} className={`${inputClass} mt-1`} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Other IDs (authorized drivers)
          <textarea rows={3} value={form.authorized_driver_ids} onChange={(event) => setForm({ ...form, authorized_driver_ids: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <div className="flex justify-end">
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Member'}
          </button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Car className="h-4 w-4" /> Vehicle and renewals</h2>
            <p className="text-xs text-slate-500">Plate, engine, chassis, MV file, case, PAMI, and LTO details</p>
          </div>
          <button onClick={() => { setEditingUnit(null); setUnitModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
            <Plus className="h-4 w-4" /> Add Vehicle
          </button>
        </div>
        {(member.units || []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No vehicle record yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {member.units?.map((unit) => (
              <article key={unit.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">{unit.plate_number}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingUnit(unit); setUnitModalOpen(true); }} className="text-xs font-semibold text-sky-700">Edit</button>
                    <button onClick={() => deleteUnit(unit)} aria-label={`Delete ${unit.plate_number}`} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-slate-500">Engine</dt><dd className="font-medium">{unit.engine_number || '—'}</dd></div>
                  <div><dt className="text-slate-500">Chassis</dt><dd className="font-medium">{unit.chassis_number || '—'}</dd></div>
                  <div><dt className="text-slate-500">MV file</dt><dd className="font-medium">{unit.mv_file_number || '—'}</dd></div>
                  <div><dt className="text-slate-500">Case number</dt><dd className="font-medium">{unit.franchise_case_number || '—'}</dd></div>
                  <div><dt className="text-slate-500">PAMI renewal</dt><dd className="font-medium">{unit.pami_renewal_date || '—'}</dd></div>
                  <div><dt className="text-slate-500">LTO renewal</dt><dd className="font-medium">{unit.lto_registration_renewal_date || '—'}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900"><CreditCard className="h-4 w-4" /> Payment history</h2>
            <p className="text-xs text-slate-500">Membership, franchise processing, monthly dues, GPS dues, and other payments</p>
          </div>
          <button onClick={() => setPaymentModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(member.payments || []).map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 font-medium">{payment.payment_type}{payment.notes && <p className="text-xs font-normal text-slate-500">{payment.notes}</p>}</td>
                  <td className="px-4 py-3 text-slate-600">{payment.payment_date}</td>
                  <td className="px-4 py-3">₱{Number(payment.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{payment.status}</td>
                </tr>
              ))}
              {(member.payments || []).length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">No payments recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <FileText className="h-4 w-4" /> Member documents
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{(member.documents || []).length}</span>
            </h2>
            <p className="text-xs text-slate-500">Saved on this computer; search, preview, or download documents.</p>
          </div>
          <button onClick={() => setDocumentUploadOpen(true)} className="inline-flex items-center gap-2 self-start rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white">
            <Upload className="h-4 w-4" /> Add Document
          </button>
        </div>

        {(member.documents || []).length > 0 && (
          <label className="relative block max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={documentSearch}
              onChange={(event) => setDocumentSearch(event.target.value)}
              placeholder="Search this member's documents"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
            />
          </label>
        )}

        {filteredDocuments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {(member.documents || []).length ? 'No documents match that search.' : 'No documents saved for this member yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Document</th><th className="px-4 py-3">Category / Date</th><th className="px-4 py-3">File</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((document) => {
                  const downloadUrl = `/api/members/${encodeURIComponent(id)}/documents/${encodeURIComponent(document.id)}`;
                  return (
                    <tr key={document.id}>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedDocument(document)} className="font-semibold text-sky-700 hover:underline">{document.title}</button>
                        {document.notes && <p className="mt-1 text-xs text-slate-500">{document.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>{document.category.replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-slate-400">Added {new Date(document.uploaded_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>{document.file_name}</p>
                        <p className="mt-1 text-slate-400">{(document.file_size / 1024).toFixed(1)} KB</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button onClick={() => setSelectedDocument(document)} aria-label={`View ${document.title}`} className="mr-3 text-slate-500 hover:text-sky-700"><Eye className="inline h-4 w-4" /></button>
                        <a href={downloadUrl} aria-label={`Download ${document.title}`} className="mr-3 text-slate-500 hover:text-sky-700"><Download className="inline h-4 w-4" /></a>
                        <button onClick={() => deleteDocument(document)} aria-label={`Delete ${document.title}`} className="text-slate-400 hover:text-rose-600"><Trash2 className="inline h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <UnitFormModal memberId={member.id} initialUnit={editingUnit} isOpen={unitModalOpen} onClose={() => setUnitModalOpen(false)} onSuccess={loadMember} />
      <PaymentFormModal memberId={member.id} isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} onSuccess={loadMember} />
      <DocumentUploadModal memberId={member.id} units={member.units} isOpen={documentUploadOpen} onClose={() => setDocumentUploadOpen(false)} onSuccess={loadMember} />
      <DocumentViewerModal document={selectedDocument} isOpen={Boolean(selectedDocument)} onClose={() => setSelectedDocument(null)} />
    </div>
  );
}
