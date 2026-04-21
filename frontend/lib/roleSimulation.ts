import {
  REQUEST_BRANCHES,
  REQUEST_ROLES,
  getAllowedRequestRolesForBranch,
  type RequestBranch,
  type RequestRole,
} from '@/lib/utilities/assignment';
import { type Permission, type UserRole } from '@/types/navigation';

export type RoleSimulationMatrix = Record<RequestBranch, RequestRole[]>;

const MATRIX_STORAGE_KEY = '__SIMULATED_ROLE_MATRIX__';
const LEGACY_ROLE_KEY = '__SIMULATED_ROLE__';

export function createEmptyRoleSimulationMatrix(): RoleSimulationMatrix {
  return {
    legal: [],
    repo: [],
    petty: [],
    advances: [],
  };
}

function isRequestBranch(value: unknown): value is RequestBranch {
  return typeof value === 'string' && (REQUEST_BRANCHES as readonly string[]).includes(value);
}

function isRequestRole(value: unknown): value is RequestRole {
  return typeof value === 'string' && (REQUEST_ROLES as readonly string[]).includes(value);
}

function sanitizeMatrix(value: unknown): RoleSimulationMatrix | null {
  if (!value || typeof value !== 'object') return null;

  const maybeMatrix = value as Partial<Record<RequestBranch, unknown>>;
  const matrix = createEmptyRoleSimulationMatrix();

  for (const branch of REQUEST_BRANCHES) {
    const rawRoles = maybeMatrix[branch];
    if (!Array.isArray(rawRoles)) return null;

    const allowedRoles = new Set(getAllowedRequestRolesForBranch(branch));
    matrix[branch] = rawRoles.filter((role): role is RequestRole => isRequestRole(role) && allowedRoles.has(role));
  }

  return matrix;
}

function rolesInMatrix(matrix: RoleSimulationMatrix): RequestRole[] {
  return Array.from(
    new Set(
      REQUEST_BRANCHES.flatMap((branch) => matrix[branch] || [])
    )
  );
}

function branchHasAnyRoles(
  matrix: RoleSimulationMatrix,
  branch: RequestBranch,
  roles: RequestRole[]
): boolean {
  return matrix[branch].some((role) => roles.includes(role));
}

export function loadRoleSimulationMatrix(): RoleSimulationMatrix {
  if (typeof window === 'undefined') {
    return createEmptyRoleSimulationMatrix();
  }

  const storedMatrix = window.localStorage.getItem(MATRIX_STORAGE_KEY);
  if (storedMatrix) {
    try {
      const parsed = JSON.parse(storedMatrix);
      const sanitized = sanitizeMatrix(parsed);
      if (sanitized) return sanitized;
    } catch {
      // fall through to legacy support
    }
  }

  const legacyRole = window.localStorage.getItem(LEGACY_ROLE_KEY);
  if (legacyRole === 'requestor' || legacyRole === 'approver' || legacyRole === 'accounting') {
    return REQUEST_BRANCHES.reduce((matrix, branch) => {
      matrix[branch] = [legacyRole];
      return matrix;
    }, createEmptyRoleSimulationMatrix());
  }

  if (legacyRole === 'admin') {
    return REQUEST_BRANCHES.reduce((matrix, branch) => {
      matrix[branch] = [...REQUEST_ROLES];
      return matrix;
    }, createEmptyRoleSimulationMatrix());
  }

  return createEmptyRoleSimulationMatrix();
}

export function saveRoleSimulationMatrix(matrix: RoleSimulationMatrix | null) {
  if (typeof window === 'undefined') return;

  if (!matrix) {
    window.localStorage.removeItem(MATRIX_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_ROLE_KEY);
    return;
  }

  window.localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(matrix));
}

export function deriveSimulatedRole(matrix: RoleSimulationMatrix): UserRole | null {
  const roles = rolesInMatrix(matrix);
  if (roles.length === 0) return null;
  if (roles.length === 1) return roles[0];
  return 'admin';
}

export function deriveSimulationPermissions(matrix: RoleSimulationMatrix): Permission[] {
  const permissions = new Set<Permission>();

  permissions.add('view_home');
  permissions.add('view_settings');

  const hasLegalOrRepo = matrix.legal.length > 0 || matrix.repo.length > 0;
  const hasPettyOrAdvances = matrix.petty.length > 0 || matrix.advances.length > 0;

  if (hasLegalOrRepo) {
    permissions.add('view_legal');
  }

  if (hasPettyOrAdvances) {
    permissions.add('view_others');
  }

  if (branchHasAnyRoles(matrix, 'legal', ['requestor', 'approver'])) {
    permissions.add('view_legal');
    permissions.add('view_legal_requests');
  }

  if (branchHasAnyRoles(matrix, 'repo', ['requestor', 'approver'])) {
    permissions.add('view_legal');
    permissions.add('view_legal_requests');
  }

  if (branchHasAnyRoles(matrix, 'legal', ['accounting'])) {
    permissions.add('view_legal');
    permissions.add('view_legal_dashboard');
  }

  if (branchHasAnyRoles(matrix, 'repo', ['accounting'])) {
    permissions.add('view_legal');
    permissions.add('view_legal_dashboard');
  }

  if (branchHasAnyRoles(matrix, 'petty', ['requestor'])) {
    permissions.add('view_others');
    permissions.add('view_petty_requests');
  }

  if (branchHasAnyRoles(matrix, 'petty', ['accounting'])) {
    permissions.add('view_others');
    permissions.add('view_others_dashboard');
  }

  if (branchHasAnyRoles(matrix, 'advances', ['requestor', 'approver'])) {
    permissions.add('view_others');
    permissions.add('view_advances_requests');
  }

  if (branchHasAnyRoles(matrix, 'advances', ['accounting'])) {
    permissions.add('view_others');
    permissions.add('view_others_dashboard');
  }

  return Array.from(permissions);
}

export function matrixHasSelections(matrix: RoleSimulationMatrix): boolean {
  return REQUEST_BRANCHES.some((branch) => (matrix[branch] || []).length > 0);
}
