import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase';
import type { RequestBranch, RequestRole } from '@/lib/utilities/assignment';

export const dynamic = 'force-dynamic';

interface Assignment {
  request_branch: RequestBranch;
  request_roles: RequestRole[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createServerClient();
    const adminSupabase = createServiceRoleClient();

    const { data: user, error: userError } = await supabase
      .from('user_accounts')
      .select('user_id, email, first_name, last_name, branch, campaign, status, created_at')
      .eq('user_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: permissions, error: permError } = await adminSupabase
      .from('user_permissions')
      .select('request_branch, request_role')
      .eq('user_id', userId);

    if (permError) {
      console.error('Failed to fetch permissions:', permError);
    }

    const groupedPermissions: Record<RequestBranch, RequestRole[]> = {
      legal: [],
      repo: [],
      petty: [],
      advances: [],
    };

    if (permissions && permissions.length > 0) {
      permissions.forEach((perm) => {
        const branch = perm.request_branch as RequestBranch;
        if (groupedPermissions[branch]) {
          groupedPermissions[branch].push(perm.request_role as RequestRole);
        }
      });
    }

    const permissionsArray: Assignment[] = Object.entries(groupedPermissions)
      .filter(([_, roles]) => roles.length > 0)
      .map(([branch, request_roles]) => ({
        request_branch: branch as RequestBranch,
        request_roles,
      }));

    return NextResponse.json({
      ...user,
      permissions: permissionsArray,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { first_name, last_name, branch, campaign, assignments, status } = body as {
      first_name?: string;
      last_name?: string | null;
      branch?: string | null;
      campaign?: string | null;
      assignments?: Assignment[];
      status?: string;
    };

    if (status !== undefined) {
      const adminSupabase = createServiceRoleClient();
      const { error: statusError } = await adminSupabase
        .from('user_accounts')
        .update({ status })
        .eq('user_id', userId);

      if (statusError) {
        console.error('Failed to update status:', statusError);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (!first_name || !first_name.trim()) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const adminSupabase = createServiceRoleClient();

    const { error: updateError } = await adminSupabase
      .from('user_accounts')
      .update({
        first_name: first_name.trim(),
        last_name: last_name?.trim() || null,
        branch: branch || null,
        campaign: campaign?.trim() || null,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update user:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    const { error: deleteError } = await adminSupabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Failed to delete old permissions:', deleteError);
      return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
    }

    if (assignments && assignments.length > 0) {
      const adminClient = createServiceRoleClient();
      
      const { data: latestRows, error: latestIdError } = await adminClient
        .from('user_permissions')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      if (latestIdError) {
        console.error('Failed to fetch latest id:', latestIdError);
      }

      const latestIdValue = latestRows?.[0]?.id ?? 0;
      const nextBaseId = BigInt(String(latestIdValue));

      const newPermissions = [];

      let index = 1;
      for (const assignment of assignments) {
        const { request_branch, request_roles } = assignment;

        for (const request_role of request_roles) {
          newPermissions.push({
            id: (nextBaseId + BigInt(index++)).toString(),
            user_id: userId,
            request_branch,
            request_role,
          });
        }
      }

      if (newPermissions.length > 0) {
        const { error: insertError } = await adminClient
          .from('user_permissions')
          .insert(newPermissions);

        if (insertError) {
          console.error('Failed to insert permissions:', insertError);
          return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}