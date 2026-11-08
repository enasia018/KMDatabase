import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

const publicPaths = new Set([
  '/login',
  '/setup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/setup',
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.has(pathname)) {
    if (pathname === '/login' || pathname === '/setup') {
      try {
        const user = await getAuthenticatedUser(request);
        if (user) return NextResponse.redirect(new URL('/', request.url));
      } catch {
        return new Response('Authentication service is temporarily unavailable.', { status: 503 });
      }
    }
    return NextResponse.next();
  }

  let user;
  try {
    user = await getAuthenticatedUser(request);
  } catch {
    return pathname.startsWith('/api/')
      ? Response.json({ error: 'Authentication service is temporarily unavailable.' }, { status: 503 })
      : new Response('Authentication service is temporarily unavailable.', { status: 503 });
  }
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|cover.png).*)'],
};
