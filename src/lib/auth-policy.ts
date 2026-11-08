export type AppRole = 'Administrator' | 'Editor' | 'Viewer';

export const ALL_ROLES: AppRole[] = ['Administrator', 'Editor', 'Viewer'];
export const EDITOR_ROLES: AppRole[] = ['Administrator', 'Editor'];

export function isRoleAllowed(role: AppRole, allowedRoles: AppRole[]): boolean {
  return allowedRoles.includes(role);
}
