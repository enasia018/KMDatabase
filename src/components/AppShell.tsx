'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

const publicPaths = new Set(['/login', '/setup']);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (publicPaths.has(pathname)) {
    return <div className="min-h-screen w-full bg-slate-50">{children}</div>;
  }

  return (
    <>
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </>
  );
}
