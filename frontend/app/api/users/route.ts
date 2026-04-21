// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromCookie } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: users, error: usersError } = await supabase
    .from('user_accounts')
    .select('user_id, first_name, last_name, is_admin')
    .order('first_name', { ascending: true });

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  const userIds = users.map(u => u.user_id);
  
  const { data: permissions, error: permError } = await supabase
    .from('user_permissions')
    .select('user_id, request_branch, request_role')
    .in('user_id', userIds);

  if (permError) {
    console.error('Error fetching permissions:', permError);
    return NextResponse.json({ error: 'Failed to fetch user permissions' }, { status: 500 });
  }

  // Group permissions by user
  const usersWithPerms = users.map(user => {
    const userPerms = permissions?.filter(p => p.user_id === user.user_id) || [];
    
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
        request_roles: request_roles,
      }));

    return {
      ...user,
      permissions: permissionsArray,
    };
  });

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json(usersWithPerms);
}
