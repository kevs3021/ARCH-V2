'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { Users, UserCheck, UserPlus, Pencil } from 'lucide-react';
import EditAccountModal from '@/components/EditAccountModal';
import NotificationStack from '@/components/NotificationStack';
import type { AuthNotification } from '@/lib/authNotifications';
import type { RequestBranch, RequestRole } from '@/lib/utilities/assignment';

type BranchStats = {
  branch: string;
  requestor: number;
  approver: number;
  accounting: number;
};

type UserPermission = {
  request_branch: RequestBranch;
  request_roles: RequestRole[];
};

type UserAccount = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  branch: string | null;
  campaign: string | null;
  status: string | null;
  created_at: string;
  permissions?: UserPermission[];
};

const StatCard = memo(function StatCard({ item }: { item: BranchStats }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold">{item.branch}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-bold">{item.requestor}</p>
          <p className="text-[10px] text-muted-foreground">Requestor</p>
        </div>
        <div>
          <p className="text-xl font-bold">{item.approver}</p>
          <p className="text-[10px] text-muted-foreground">Approver</p>
        </div>
        <div>
          <p className="text-xl font-bold">{item.accounting}</p>
          <p className="text-[10px] text-muted-foreground">Accounting</p>
        </div>
      </div>
    </div>
  );
});

const UserRow = memo(function UserRow({ user, onEdit, onStatusChange }: { user: UserAccount; onEdit: (user: UserAccount) => void; onStatusChange: (user: UserAccount) => void }) {
  return (
    <tr key={user.user_id} className="border-b border-border/20 hover:bg-muted/30">
      <td className="py-3 px-4 text-sm">
        {user.first_name} {user.last_name}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
      <td className="py-3 px-4 text-sm">
        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary">
          {user.role || '-'}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{user.branch || '-'}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{user.campaign || '-'}</td>
      <td className="py-3 px-4 text-sm">
        <button
          type="button"
          onClick={() => onStatusChange(user)}
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${
            user.status === 'Active' 
              ? 'bg-green-500/15 text-green-600' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {user.status || 'Pending'}
        </button>
      </td>
      <td className="py-3 px-4">
        <button
          type="button"
          onClick={() => onEdit(user)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Edit user"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
});

export default function AccountsPage() {
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [roleCounts, setRoleCounts] = useState<BranchStats[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [notifications, setNotifications] = useState<AuthNotification[]>([]);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  const pushToast = useCallback((notification: Omit<AuthNotification, 'id'>) => {
    const id = crypto.randomUUID();
    const next: AuthNotification = { ...notification, id };
    setNotifications((current) => [...current, next]);
    const timer = setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
      toastTimersRef.current.delete(id);
    }, 5000);
    toastTimersRef.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await fetch('/api/utilities/accounts');
        const data = await res.json();
        if (cancelled) return;
        if (data.roleCounts) setRoleCounts(data.roleCounts);
        if (data.users) setUsers(data.users);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const handleEditClick = useCallback((user: UserAccount) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  }, []);

  const handleStatusChange = useCallback(async (user: UserAccount) => {
    if (user.status === 'Active') return;

    try {
      const res = await fetch(`/api/utilities/accounts/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      pushToast({
        tone: 'message',
        title: 'Account activated',
        message: `${user.first_name} ${user.last_name} has been activated.`,
      });

      async function refreshData() {
        try {
          const res = await fetch('/api/utilities/accounts');
          const data = await res.json();
          if (data.roleCounts) setRoleCounts(data.roleCounts);
          if (data.users) setUsers(data.users);
        } catch (err) {
          console.error('Failed to fetch data:', err);
        }
      }
      refreshData();
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Activation failed',
        message: err instanceof Error ? err.message : 'Unable to activate account.',
      });
    }
  }, [pushToast]);

  const handleEditSuccess = useCallback(() => {
    async function refreshData() {
      try {
        const res = await fetch('/api/utilities/accounts');
        const data = await res.json();
        if (data.roleCounts) setRoleCounts(data.roleCounts);
        if (data.users) setUsers(data.users);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    }
    refreshData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-15">
      <NotificationStack notifications={notifications} onDismiss={dismissToast} />
      
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Utilities</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Accounts</h1>
        </div>

        <Link
          href="/utilities/assignment"
          className="btn-primary inline-flex items-center gap-2 px-4 py-3"
        >
          <UserCheck className="w-4 h-4" />
          Batch Role Assignment
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roleCounts.map((item) => (
          <StatCard key={item.branch} item={item} />
        ))}
        {roleCounts.length === 0 && (
          <div key="no-data" className="glass-card p-4 col-span-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">No role assignments yet</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending Approvals - Space for now */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Pending Account Approvals
        </h2>
        <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No pending accounts for approval
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          All Accounts
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Branch</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Campaign</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.user_id} user={user} onEdit={handleEditClick} onStatusChange={handleStatusChange} />
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No accounts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <EditAccountModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
