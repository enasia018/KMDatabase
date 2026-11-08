'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/members?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Mobile trigger & Page Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="KM Tourist"
              className="w-8 h-8 rounded-full border border-slate-200 object-contain md:hidden"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  KM Tourist Transport Services OPC
                </span>
                <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold border border-sky-200 hidden sm:inline">
                  Franchise Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{todayStr}</span>
                <span>•</span>
                <a href="tel:09532966323" className="font-semibold text-emerald-700 hover:underline">
                  📞 0953 296 6323
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member name, ID, plate, engine, chassis, or MV file..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-sky-500 rounded-lg outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </form>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/members/new"
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold py-1.5 px-3.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Member</span>
          </Link>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, ID, or vehicle record..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 rounded-lg outline-none"
              />
            </div>
          </form>
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-sky-600"
          >
            Dashboard
          </Link>
          <Link
            href="/members"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-sky-600"
          >
            Members Directory
          </Link>
          <Link
            href="/payments"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-sky-600"
          >
            Payments
          </Link>
        </div>
      )}
    </header>
  );
}
