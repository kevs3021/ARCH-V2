import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const REQUEST_BRANCHES = ['legal', 'repo', 'petty', 'advances'] as const;

function formatBranchRole(requestBranch: string, requestRole: string): string {
  const branch = requestBranch.charAt(0).toUpperCase() + requestBranch.slice(1);
  const role = requestRole.charAt(0).toUpperCase() + requestRole.slice(1);
  return `${branch} ${role}`;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createServiceRoleClient();

    const { data: users, error: usersError } = await adminSupabase
      .from('user_accounts')
      .select('user_id, email, first_name, last_name, branch, campaign, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        roleCounts: [],
        users: [],
      });
    }

    const userIds = users.map(u => u.user_id);

    const { data: permissions, error: permError } = await adminSupabase
      .from('user_permissions')
      .select('user_id, request_branch, request_role')
      .in('user_id', userIds);

    if (permError) {
      console.error('Failed to fetch permissions:', permError);
    }

    type BranchStats = {
      branch: string;
      requestor: number;
      approver: number;
      accounting: number;
    };

    const branchStats: Record<string, BranchStats> = {};

    REQUEST_BRANCHES.forEach(b => {
      branchStats[b] = {
        branch: b.charAt(0).toUpperCase() + b.slice(1),
        requestor: 0,
        approver: 0,
        accounting: 0,
      };
    });

    const usersWithRoles = users.map(user => {
      const userPerms = permissions?.filter(p => p.user_id === user.user_id) || [];
      const roleLabels = userPerms.map(p => formatBranchRole(p.request_branch, p.request_role));

      const groupedPerms: Record<string, string[]> = {};
      userPerms.forEach(p => {
        const branch = p.request_branch.toLowerCase();
        if (!groupedPerms[branch]) {
          groupedPerms[branch] = [];
        }
        groupedPerms[branch].push(p.request_role.toLowerCase());
      });

      const permissionsArray = Object.entries(groupedPerms)
        .filter(([_, roles]) => roles.length > 0)
        .map(([branch, request_roles]) => ({
          request_branch: branch,
          request_roles: request_roles as ('requestor' | 'approver' | 'accounting')[],
        }));
      
      userPerms.forEach(p => {
        const branch = p.request_branch.toLowerCase();
        if (branchStats[branch]) {
          const roleKey = p.request_role.toLowerCase() as keyof Pick<BranchStats, 'requestor' | 'approver' | 'accounting'>;
          if (roleKey in branchStats[branch]) {
            branchStats[branch][roleKey]++;
          }
        }
      });

      return {
        ...user,
        role: roleLabels.length > 0 ? roleLabels.join(', ') : '-',
        permissions: permissionsArray,
      };
    });

    const branchStatsArray = Object.values(branchStats);

    return NextResponse.json({
      roleCounts: branchStatsArray,
      users: usersWithRoles,
    });
  } catch (error) {
    console.error('Accounts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}