// components/layout/AppShell.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Navigation } from './Navigation';
import { UserWithRBAC, UserRole, getPermissionsForRole } from '@/types/navigation';
import FloatingChatButton from '@/components/FloatingChatButton';
import { createBrowserClient } from '@supabase/ssr';

// Map DB roles to nav roles
function toNavRole(role: string): UserRole {
  const r = role.toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'accounting') return 'accounting';
  if (r === 'approver') return 'approver';
  return 'requestor';
}

const HIDDEN_NAV_PATHS = ['/login', '/register'];

function derivePermissionsFromRecords(records: { request_branch: string; request_roles: string[] }[]): import('@/types/navigation').Permission[] {
  const permissions: import('@/types/navigation').Permission[] = ['view_home', 'view_chat', 'view_settings'];
  
  const branches = new Set(records.map(r => r.request_branch?.toLowerCase()));
  const roles = new Set<string>();
  records.forEach(r => {
    (r.request_roles || []).forEach(role => roles.add(role.toLowerCase()));
  });
  
  if (branches.has('legal')) {
    permissions.push('view_legal', 'view_legal_requests');
    if (roles.has('approver') || roles.has('accounting') || roles.has('admin')) {
      permissions.push('view_legal_dashboard');
    }
  }
  
  if (branches.has('advances') || branches.has('repo')) {
    permissions.push('view_others');
    permissions.push('view_advances_requests');
    if (roles.has('approver') || roles.has('accounting') || roles.has('admin')) {
      permissions.push('view_others_dashboard');
    }
  }
  
  if (branches.has('petty')) {
    permissions.push('view_petty_requests');
  }
  
  if (roles.has('accounting') || roles.has('admin')) {
    permissions.push('view_utilities');
  }
  
  return permissions;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !HIDDEN_NAV_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [user, setUser] = useState<UserWithRBAC | null>({
    id: '',
    email: '',
    name: '',
    role: 'requestor',
    permissions: getPermissionsForRole('requestor'),
  });

  const [currentUserId, setCurrentUserId] = useState<string>('');

  const fetchUserWithPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data?.user) {
        const fetchedUserId = data.user.userId;
        setCurrentUserId(fetchedUserId);
        
        const navRole = data.user.isAdmin === true ? 'admin' : toNavRole(data.user.role || 'requestor');
        
        let permissions: import('@/types/navigation').Permission[] = [];
        
        if (data.user.isAdmin !== true) {
          const permRes = await fetch(`/api/utilities/accounts/${fetchedUserId}`);
          const permData = await permRes.json();
          if (permData?.permissions && Array.isArray(permData.permissions)) {
            permissions = derivePermissionsFromRecords(permData.permissions);
          }
        }
        
        if (permissions.length === 0) {
          permissions = getPermissionsForRole(navRole);
        }
        
        setUser({
          id: fetchedUserId,
          email: data.user.email,
          name: data.user.name,
          role: navRole,
          avatarUrl: data.user.profileUrl || undefined,
          isAdmin: data.user.isAdmin === true,
          permissions: permissions,
        });
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  }, []);

  useEffect(() => {
    if (!showNav) return;
    fetchUserWithPermissions();
  }, [showNav, fetchUserWithPermissions]);

  useEffect(() => {
    if (!showNav || !currentUserId) return;
    
    const channel = supabase.channel('user_permissions_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_permissions',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('Permission changed, refreshing...', payload);
          fetchUserWithPermissions();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [showNav, currentUserId, supabase, fetchUserWithPermissions]);

  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation user={user} />
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 relative z-30 px-8 lg:px-12 xl:px-32">
        {children}
      </main>
      <FloatingChatButton />
    </>
  );
}
