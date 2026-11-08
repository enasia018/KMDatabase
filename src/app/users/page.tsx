import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const requestHeaders = await headers();
  const user = await getAuthenticatedUser(new Request('http://localhost/users', { headers: requestHeaders }));
  if (!user || user.role !== 'Administrator') redirect('/');
  return <UsersClient />;
}
