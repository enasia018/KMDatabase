import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'KM Tourist Transport Services OPC - Franchise Database System',
  description:
    'Official Franchise Member, Unit Fleet, Payments and Document Management System for KM Tourist Transport Services OPC (SEC No. 20240198058-20, DTI No. 5511875)',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 min-h-screen text-slate-900 flex">
        {/* Left Sidebar (Hidden on mobile, collapsible) */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Right Main Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Navbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
