/**
 * Navigation Types and RBAC-Ready Data Structures
 *
 * This module defines the navigation structure with RBAC support.
 * Permission checks filter navigation items based on user roles/permissions.
 * Parent items with no visible children are automatically hidden.
 */

// RBAC Permission Types
export type Permission =
  | 'view_home'
  | 'view_chat'
  | 'view_legal'
  | 'view_legal_requests'
  | 'view_legal_dashboard'
  | 'view_others'
  | 'view_advances_requests'
  | 'view_petty_requests'
  | 'view_others_dashboard'
  | 'view_utilities'
  | 'view_settings';

// User Role Type (extend this as needed)
export type UserRole = 'admin' | 'approver' | 'accounting' | 'requestor';

// Navigation Item Interface
export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: () => React.JSX.Element;
  permission?: Permission;
  children?: NavItem[];
  badge?: string | number;
  description?: string;
}

// User with RBAC context
export interface UserWithRBAC {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: Permission[];
  avatarUrl?: string;
  isAdmin?: boolean;
}

// Navigation Group (for organizing items)
export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  permission?: Permission;
}

// Role-based permission mappings
export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'view_home',
    'view_chat',
    'view_legal',
    'view_legal_requests',
    'view_legal_dashboard',
    'view_others',
    'view_advances_requests',
    'view_petty_requests',
    'view_others_dashboard',
    'view_utilities',
    'view_settings',
  ],
  approver: [
    'view_home',
    'view_chat',
    'view_legal',
    'view_legal_requests',
    'view_legal_dashboard',
    'view_others',
    'view_advances_requests',
    'view_petty_requests',
    'view_others_dashboard',
    'view_settings',
  ],
  accounting: [
    'view_home',
    'view_chat',
    'view_legal',
    'view_legal_requests',
    'view_others',
    'view_advances_requests',
    'view_petty_requests',
    'view_settings',
  ],
  requestor: [
    'view_home',
    'view_chat',
    'view_legal',
    'view_legal_requests',
    'view_others',
    'view_advances_requests',
    'view_petty_requests',
    'view_settings',
  ],
};

/**
 * Filter navigation items based on user permissions.
 * - Items without a permission are always shown.
 * - Parent items with children are hidden when ALL children are filtered out.
 * - Recursively filters nested children.
 */
export function filterNavItemsByPermissions(
  items: NavItem[],
  userPermissions: Permission[]
): NavItem[] {
  return items
    .map((item) => {
      // If item has children, recursively filter them first
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterNavItemsByPermissions(
          item.children,
          userPermissions
        );

        // If parent requires permission the user lacks, hide it entirely
        if (item.permission && !userPermissions.includes(item.permission)) {
          return null;
        }

        // If all children were filtered out, hide the parent too
        if (filteredChildren.length === 0) {
          return null;
        }

        return { ...item, children: filteredChildren };
      }

      // Leaf item: check permission
      if (item.permission && !userPermissions.includes(item.permission)) {
        return null;
      }

      return item;
    })
    .filter((item): item is NavItem => item !== null);
}

/**
 * Get default permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}
