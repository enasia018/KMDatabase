'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RefreshCw, Shield, UserPlus } from 'lucide-react';

type AppRole = 'Administrator' | 'Editor' | 'Viewer';
interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  is_active: boolean;
}

const roleOptions: AppRole[] = ['Administrator', 'Editor', 'Viewer'];

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newAccount, setNewAccount] = useState({
    email: '',
    password: '',
    role: 'Viewer' as AppRole,
  });
  const [edits, setEdits] = useState<Record<string, { role: AppRole; is_active: boolean; password: string }>>({});

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load user accounts.');
      setUsers(result);
      setEdits(Object.fromEntries(result.map((user: AppUser) => [
        user.id,
        { role: user.role, is_active: user.is_active, password: '' },
      ])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load user accounts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create account.');
      setNewAccount({ email: '', password: '', role: 'Viewer' });
      setMessage(`Account created for ${result.user.email}.`);
      await loadUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create account.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAccount(user: AppUser) {
    const edit = edits[user.id];
    if (!edit) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updates = {
        role: edit.role,
        is_active: edit.is_active,
      };
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update account.');
      setMessage(`Account updated for ${result.user.email}.`);
      await loadUsers();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update account.');
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(user: AppUser) {
    const edit = edits[user.id];
    if (!edit?.password) {
      setError('Enter a new password before resetting this account.');
      return;
    }
    if (!confirm(`Set a new password for ${user.email}? Their current sessions will be signed out.`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: edit.password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not reset account password.');
      setEdits((current) => ({ ...current, [user.id]: { ...edit, password: '' } }));
      setMessage(`A new password was set for ${user.email}; existing sessions were signed out.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not reset account password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Shield className="h-6 w-6 text-sky-700" /> User accounts</h1>
          <p className="mt-1 text-sm text-slate-500">Only Administrators can create accounts, assign roles, reset passwords, or deactivate access. Existing passwords are never displayed.</p>
        </div>
        <button onClick={loadUsers} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

      <form onSubmit={createAccount} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><UserPlus className="h-4 w-4" /> Create account</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600 md:col-span-1">
            Username or email
            <input type="text" required autoComplete="off" value={newAccount.email} onChange={(event) => setNewAccount({ ...newAccount, email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-1">
            Temporary password (12+ chars)
            <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={newAccount.password} onChange={(event) => setNewAccount({ ...newAccount, password: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Role
            <select value={newAccount.role} onChange={(event) => setNewAccount({ ...newAccount, role: event.target.value as AppRole })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
              {roleOptions.map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button disabled={saving} className="w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Create account</button>
          </div>
        </div>
      </form>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading accounts…</p>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No accounts found.</p>
        ) : (
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Set new password</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const edit = edits[user.id];
                if (!edit) return null;
                return (
                  <tr key={user.id} className="align-middle">
                    <td className="px-4 py-3 font-medium text-slate-800">{user.email}</td>
                    <td className="px-4 py-3">
                      <select value={edit.role} onChange={(event) => setEdits({ ...edits, [user.id]: { ...edit, role: event.target.value as AppRole } })} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
                        {roleOptions.map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={edit.is_active} onChange={(event) => setEdits({ ...edits, [user.id]: { ...edit, is_active: event.target.checked } })} />
                        Active
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <input type="password" minLength={12} maxLength={128} autoComplete="new-password" placeholder="New password (12+ chars)" aria-label={`New password for ${user.email}`} value={edit.password} onChange={(event) => setEdits({ ...edits, [user.id]: { ...edit, password: event.target.value } })} className="w-48 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                    </td>
                    <td className="space-y-2 px-4 py-3">
                      <button disabled={saving} onClick={() => saveAccount(user)} className="block rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-sky-700 disabled:opacity-50">Save account</button>
                      <button disabled={saving || !edit.password} onClick={() => resetPassword(user)} className="block rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50">Set new password</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="font-semibold text-slate-800">Administrator</h3><p className="mt-1 text-xs text-slate-500">Full access, including user and database management.</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="font-semibold text-slate-800">Editor</h3><p className="mt-1 text-xs text-slate-500">View and manage members, vehicles, payments, and documents.</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="font-semibold text-slate-800">Viewer</h3><p className="mt-1 text-xs text-slate-500">Read-only access to member, vehicle, payment, and document information.</p></div>
      </div>
      <p className="text-xs text-slate-500">Share a newly set password with the user through a separate secure channel. Resetting it signs out their existing sessions.</p>
    </div>
  );
}
