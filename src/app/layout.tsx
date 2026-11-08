import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
