export const REQUEST_BRANCHES = ['legal', 'repo', 'petty', 'advances'] as const;

export const REQUEST_ROLES = ['requestor', 'approver', 'accounting'] as const;

export const REQUEST_ROLES_BY_BRANCH: Record<RequestBranch, RequestRole[]> = {
  legal: [...REQUEST_ROLES],
  repo: [...REQUEST_ROLES],
  petty: ['requestor', 'accounting'],
  advances: [...REQUEST_ROLES],
};

export type RequestBranch = (typeof REQUEST_BRANCHES)[number];

export type RequestRole = (typeof REQUEST_ROLES)[number];

export type RequestBranchSelection = {
  request_branch: RequestBranch;
  request_roles: RequestRole[];
};

export type UserPermissionRow = {
  user_id: string;
  request_branch: RequestBranch;
  request_role: RequestRole;
};

export function formatRequestBranch(branch: RequestBranch) {
  return branch.charAt(0).toUpperCase() + branch.slice(1);
}

export function formatRequestRole(role: RequestRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getAllowedRequestRolesForBranch(branch: RequestBranch): RequestRole[] {
  return REQUEST_ROLES_BY_BRANCH[branch] || [...REQUEST_ROLES];
}

export function isAllowedRequestRoleForBranch(branch: RequestBranch, role: RequestRole): boolean {
  return getAllowedRequestRolesForBranch(branch).includes(role);
}

export function buildUserPermissionRows(
  userIds: string[],
  selections: RequestBranchSelection[]
): UserPermissionRow[] {
  const rows: UserPermissionRow[] = [];
  const seen = new Set<string>();

  userIds.forEach((userId) => {
    selections.forEach((selection) => {
      const allowedRoles = new Set(getAllowedRequestRolesForBranch(selection.request_branch));
      selection.request_roles.forEach((requestRole) => {
        if (!allowedRoles.has(requestRole)) return;
        const key = `${userId}:${selection.request_branch}:${requestRole}`;
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({
          user_id: userId,
          request_branch: selection.request_branch,
          request_role: requestRole,
        });
      });
    });
  });

  return rows;
}
