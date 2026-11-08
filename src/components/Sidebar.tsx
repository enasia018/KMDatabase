'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthUser } from '@/lib/use-auth-user';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  PlusCircle,
  Shield,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuthUser();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Members & Vehicles', href: '/members', icon: Users },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    ...(role === 'Administrator' ? [{ label: 'User Accounts', href: '/users', icon: Shield }] : []),
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 p-0.5 shrink-0 border border-amber-400/30 shadow-md group-hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="KM Tourist Transport Services Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight text-white leading-tight">
              KM TOURIST
            </h1>
            <p className="text-[11px] text-sky-400 font-medium truncate">
              Transport Services OPC
            </p>
            <p className="text-[9px] text-slate-400 font-mono truncate">
              SEC: 20240198058-20
            </p>
          </div>
        </Link>
      </div>

      {/* Quick Add CTA */}
      {role && role !== 'Viewer' && (
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/members/new"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-medium py-2.5 px-4 rounded-lg shadow-md shadow-sky-900/40 transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Member</span>
        </Link>
      </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Management
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <span>KM Tourist • v1.0</span>
        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">2026</span>
      </div>
    </aside>
  );
}
