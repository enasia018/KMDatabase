import { randomBytes } from 'crypto';
import {
  authSetupRequired,
  createAuthSession,
  deleteAuthSession,
  getAuthenticatedSession,
  type AuthenticatedUser,
} from './db';
import { ALL_ROLES, EDITOR_ROLES, isRoleAllowed, type AppRole } from './auth-policy';
import { hashSessionToken } from './auth-crypto';

export const SESSION_COOKIE = 'km_transport_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
export { ALL_ROLES, EDITOR_ROLES };

export interface AuthorizationResult {
  user: AuthenticatedUser | null;
  response: Response | null;
}

export function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export function isValidLoginIdentifier(identifier: string): boolean {
  return identifier.length <= 254 && (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) ||
    /^[a-z0-9][a-z0-9._-]{1,63}$/.test(identifier)
  );
}

export function isValidPassword(password: string): boolean {
  return password.length >= 12 && password.length <= 128;
}

export async function isSetupRequired(): Promise<boolean> {
  return authSetupRequired();
}

function getCookieValue(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  for (const segment of cookieHeader.split(';')) {
    const [name, ...parts] = segment.trim().split('=');
    if (name === SESSION_COOKIE) return parts.join('=') || null;
  }
  return null;
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = getCookieValue(request);
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  return getAuthenticatedSession(hashSessionToken(token));
}

export async function createLoginSession(user: AuthenticatedUser): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();
  await createAuthSession(user.id, hashSessionToken(token), expiresAt);
  return token;
}

export async function revokeRequestSession(request: Request): Promise<void> {
  const token = getCookieValue(request);
  if (token && /^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    await deleteAuthSession(hashSessionToken(token));
  }
}

export async function authorizeApiRequest(
  request: Request,
  allowedRoles: AppRole[] = ALL_ROLES
): Promise<AuthorizationResult> {
  let user: AuthenticatedUser | null;
  try {
    user = await getAuthenticatedUser(request);
  } catch (error) {
    console.error('Authentication storage unavailable:', error);
    return {
      user: null,
      response: Response.json({ error: 'Authentication service is temporarily unavailable.' }, { status: 503 }),
    };
  }

  if (!user) {
    return {
      user: null,
      response: Response.json({ error: 'Authentication required.' }, { status: 401 }),
    };
  }
  if (!isRoleAllowed(user.role, allowedRoles)) {
    return {
      user: null,
      response: Response.json({ error: 'Your account does not have permission for this action.' }, { status: 403 }),
    };
  }
  return { user, response: null };
}
