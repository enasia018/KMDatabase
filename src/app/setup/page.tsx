'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/setup')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not check setup status.');
        setSetupRequired(result.setupRequired);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not check setup status.');
        setSetupRequired(false);
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the administrator.');
      router.replace('/login');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the administrator.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
        <div className="text-center">
          <img src="/logo.png" alt="KM Transport" className="mx-auto mb-4 h-16 w-16 rounded-full object-contain" />
          <h1 className="text-2xl font-bold text-slate-900">Create first administrator</h1>
          <p className="mt-2 text-sm text-slate-600">Choose a password now. The password will be securely hashed before it is saved.</p>
        </div>
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Security warning: anyone who reaches this public site before the first account is created could claim the administrator account. Keep the service stopped until you are ready, then open this page and finish setup immediately. Hiding or not sharing this URL is not security.
        </div>
        {setupRequired === null ? (
          <p className="text-center text-sm text-slate-500">Checking setup status…</p>
        ) : !setupRequired ? (
          <div className="space-y-3 text-center">
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">First-admin setup is complete. Public account creation is disabled.</p>
            <Link href="/login" className="inline-flex rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white">Go to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Administrator username
              <input
                autoComplete="username"
                required
                maxLength={254}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-600"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              New password (12–128 characters)
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-600"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-600"
              />
            </label>
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <button disabled={saving} className="w-full rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Creating administrator…' : 'Create first administrator'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
