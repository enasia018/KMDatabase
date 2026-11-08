import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { hashPassword, hashSessionToken, verifyPassword } from '../src/lib/auth-crypto.ts';
import { isRoleAllowed } from '../src/lib/auth-policy.ts';

const root = new URL('../src/', import.meta.url);
const readSource = (path) => readFile(new URL(path, root), 'utf8');

test('password hashes are salted and verify only the matching password', async () => {
  const firstHash = await hashPassword('Correct Horse Battery Staple 12!');
  const secondHash = await hashPassword('Correct Horse Battery Staple 12!');

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword('Correct Horse Battery Staple 12!', firstHash), true);
  assert.equal(await verifyPassword('wrong password', firstHash), false);
  assert.equal(await verifyPassword('anything', 'plain-text-password'), false);
});

test('session tokens are stored as one-way hashes', () => {
  const token = 'an-example-random-session-token';
  assert.notEqual(hashSessionToken(token), token);
  assert.equal(hashSessionToken(token), hashSessionToken(token));
});

test('role policy permits viewers to read but editors alone cannot administer accounts', () => {
  const allRoles = ['Administrator', 'Editor', 'Viewer'];
  const editors = ['Administrator', 'Editor'];
  const administrators = ['Administrator'];

  assert.equal(isRoleAllowed('Viewer', allRoles), true);
  assert.equal(isRoleAllowed('Viewer', editors), false);
  assert.equal(isRoleAllowed('Editor', editors), true);
  assert.equal(isRoleAllowed('Editor', administrators), false);
  assert.equal(isRoleAllowed('Administrator', administrators), true);
});

test('every data API handler has an explicit server-side role guard', async () => {
  const guardedHandlers = {
    'app/api/members/route.ts': ['authorizeApiRequest(request)', 'authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/members/[id]/route.ts': ['authorizeApiRequest(request)', 'authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/units/route.ts': ['authorizeApiRequest(request)', 'authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/units/[id]/route.ts': ['authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/payments/route.ts': ['authorizeApiRequest(request)', 'authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/payments/[id]/route.ts': ['authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/stats/route.ts': ['authorizeApiRequest(request)'],
    'app/api/documents/route.ts': ['authorizeApiRequest(request)', 'authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/documents/[id]/route.ts': ['authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/members/[id]/documents/route.ts': ['authorizeApiRequest(_request)', 'authorizeApiRequest(request, EDITOR_ROLES)'],
    'app/api/members/[id]/documents/[documentId]/route.ts': ['authorizeApiRequest(request)', 'authorizeApiRequest(_request, EDITOR_ROLES)'],
    'app/api/database/status/route.ts': ["authorizeApiRequest(request, ['Administrator'])"],
    'app/api/admin/users/route.ts': ["authorizeApiRequest(request, ['Administrator'])"],
    'app/api/admin/users/[id]/route.ts': ["authorizeApiRequest(request, ['Administrator'])"],
  };

  for (const [path, guards] of Object.entries(guardedHandlers)) {
    const source = await readSource(path);
    for (const guard of guards) assert.ok(source.includes(guard), `${path} is missing ${guard}`);
  }
});

test('proxy allows first-admin setup only through the gated one-time setup surface', async () => {
  const source = await readSource('proxy.ts');
  for (const publicPath of ["'/login'", "'/setup'", "'/api/auth/login'", "'/api/auth/logout'", "'/api/auth/setup'"]) {
    assert.ok(source.includes(publicPath), `Expected explicit public route ${publicPath}`);
  }
  assert.match(source, /getAuthenticatedUser\(request\)/);
  assert.ok(source.includes("pathname.startsWith('/api/')"));
});

test('first-admin setup rejects invalid identifiers and passwords before hashing', async () => {
  const login = await readSource('app/api/auth/login/route.ts');
  const endpoint = await readSource('app/api/auth/setup/route.ts');
  assert.ok(endpoint.includes('isValidLoginIdentifier(email)'));
  assert.ok(endpoint.includes('isValidPassword(body.password)'));
  assert.ok(login.includes('Complete first-administrator setup at /setup'));
});

test('web bootstrap creates an admin only while no users exist and subsequent attempts fail', async () => {
  const endpoint = await readSource('app/api/auth/setup/route.ts');
  const setupPage = await readSource('app/setup/page.tsx');
  const database = await readFile(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
  assert.ok(endpoint.includes('createBootstrapAdmin(email, await hashPassword(body.password))'));
  assert.ok(endpoint.includes('if (!user)'));
  assert.ok(endpoint.includes('status: 409'));
  assert.ok(endpoint.includes('isValidPassword(body.password)'));
  assert.ok(setupPage.includes('setSetupRequired(result.setupRequired)'));
  assert.ok(setupPage.includes('anyone who reaches this public site'));
  assert.ok(setupPage.includes("useState('admin')"));

  const neonBootstrap = database.slice(
    database.indexOf('export async function createBootstrapAdmin'),
    database.indexOf('export async function getAuthUserByEmail')
  );
  assert.ok(neonBootstrap.includes('UPDATE app_auth_settings'));
  assert.ok(neonBootstrap.includes('bootstrap_completed = FALSE'));
  assert.ok(neonBootstrap.includes('AND NOT EXISTS (SELECT 1 FROM app_users)'));
  assert.ok(neonBootstrap.includes('RETURNING id'));
  assert.ok(neonBootstrap.includes('SELECT ${id}, ${email}, ${passwordHash}'));
  assert.ok(neonBootstrap.includes('db.authBootstrapComplete || (db.authUsers || []).length > 0'));
});

test('login supports the admin username and email identifiers', async () => {
  const auth = await readSource('lib/auth.ts');
  const loginPage = await readSource('app/login/page.tsx');
  assert.ok(auth.includes('/^[a-z0-9][a-z0-9._-]{1,63}$/'));
  assert.ok(loginPage.includes('Username or email'));
});

test('account service guards the last active administrator and revokes sessions on disable/reset', async () => {
  const source = await readFile(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
  assert.match(source, /active_admin_count > 1/);
  assert.match(source, /length <= 1/);
  assert.match(source, /DELETE FROM app_sessions WHERE user_id = \$\{id\}/);
});

test('only administrators can set a new hashed password and reset revokes sessions', async () => {
  const endpoint = await readSource('app/api/admin/users/[id]/route.ts');
  const database = await readFile(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
  const userManagement = await readSource('app/users/UsersClient.tsx');

  assert.ok(endpoint.includes("authorizeApiRequest(request, ['Administrator'])"));
  assert.ok(endpoint.includes('isValidPassword(body.password)'));
  assert.ok(endpoint.includes('updates.password_hash = await hashPassword(body.password)'));
  assert.ok(endpoint.includes('return NextResponse.json({ user })'));
  assert.ok(database.includes('if (updates.password_hash || updates.is_active === false)'));
  assert.ok(database.includes('DELETE FROM app_sessions WHERE user_id = ${id}'));
  assert.ok(userManagement.includes('async function resetPassword(user: AppUser)'));
  assert.ok(userManagement.includes("JSON.stringify({ password: edit.password })"));
  assert.ok(userManagement.includes('Set new password'));
  assert.ok(userManagement.includes('Existing passwords are never displayed.'));
});

test('shared-data views refresh periodically and on focus without overwriting profile edits', async () => {
  const refresh = await readSource('lib/use-auto-refresh.ts');
  assert.match(refresh, /setInterval/);
  assert.match(refresh, /addEventListener\('focus'/);
  assert.match(refresh, /visibilityState === 'hidden'/);

  for (const path of [
    'app/page.tsx',
    'app/members/page.tsx',
    'app/members/[id]/page.tsx',
    'app/payments/page.tsx',
  ]) {
    const source = await readSource(path);
    assert.ok(source.includes('useAutoRefresh'), `${path} must enable shared-data refresh`);
  }

  const memberProfile = await readSource('app/members/[id]/page.tsx');
  assert.ok(memberProfile.includes('loadMember(true)'));
  assert.ok(memberProfile.includes('hasUnsavedChanges'));
});
