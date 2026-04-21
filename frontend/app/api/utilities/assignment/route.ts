import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookie } from '@/lib/auth';
import {
  REQUEST_BRANCHES,
  REQUEST_ROLES,
  buildUserPermissionRows,
  type RequestBranch,
  type RequestBranchSelection,
  type RequestRole,
} from '@/lib/utilities/assignment';
import { createServiceRoleClient } from '@/lib/supabase';

type AssignmentPayload = {
  userIds?: string[];
  assignments?: RequestBranchSelection[];
};

function isRequestBranch(value: unknown): value is RequestBranch {
  return typeof value === 'string' && (REQUEST_BRANCHES as readonly string[]).includes(value);
}

function isRequestRole(value: unknown): value is RequestRole {
  return typeof value === 'string' && (REQUEST_ROLES as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can assign batch roles' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as AssignmentPayload;
    const userIds = Array.isArray(body.userIds)
      ? body.userIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one user' },
        { status: 400 }
      );
    }

    if (assignments.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one request branch' },
        { status: 400 }
      );
    }

    const normalizedAssignments: RequestBranchSelection[] = [];

    for (const assignment of assignments) {
      if (!assignment || !isRequestBranch(assignment.request_branch)) {
        return NextResponse.json(
          { error: 'Invalid request branch detected' },
          { status: 400 }
        );
      }

      const roles = Array.isArray(assignment.request_roles)
        ? assignment.request_roles.filter(isRequestRole)
        : [];

      if (roles.length === 0) {
        return NextResponse.json(
          { error: `Select at least one role for ${assignment.request_branch}` },
          { status: 400 }
        );
      }

      normalizedAssignments.push({
        request_branch: assignment.request_branch,
        request_roles: Array.from(new Set(roles)),
      });
    }

    const rows = buildUserPermissionRows(userIds, normalizedAssignments);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No permission rows were generated' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: latestRows, error: latestIdError } = await supabase
      .from('user_permissions')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (latestIdError) {
      console.error('Failed to fetch latest user_permissions id:', latestIdError);
      return NextResponse.json(
        { error: 'Unable to prepare permission assignments. Please try again.' },
        { status: 500 }
      );
    }

    const latestIdValue = latestRows?.[0]?.id ?? 0;
    const nextBaseId = BigInt(String(latestIdValue));
    const rowsWithIds = rows.map((row, index) => ({
      id: (nextBaseId + BigInt(index + 1)).toString(),
      ...row,
    }));

    const { error } = await supabase.from('user_permissions').insert(rowsWithIds);

    if (error) {
      console.error('Batch role assignment error:', error);
      return NextResponse.json(
        { error: 'Unable to save permission assignments. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inserted: rows.length,
    });
  } catch (error) {
    console.error('Batch role assignment route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
