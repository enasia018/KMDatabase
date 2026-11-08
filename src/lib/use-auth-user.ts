'use client';

import { useEffect, useState } from 'react';

export type AppRole = 'Administrator' | 'Editor' | 'Viewer';
export interface AuthUserSummary {
  id: string;
  email: string;
  role: AppRole;
}

export function useAuthUser() {
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load signed-in account.');
        return response.json();
      })
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { user, role: user?.role ?? null, loading };
}
