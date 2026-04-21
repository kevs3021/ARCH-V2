'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import NotificationStack from '@/components/NotificationStack';
import RequestBranchRolesPanel from '@/components/utilities/RequestBranchRolesPanel';
import {
  buildUserPermissionRows,
  formatRequestBranch,
  formatRequestRole,
  type RequestBranch,
  type RequestRole,
} from '@/lib/utilities/assignment';
import type { AuthNotification } from '@/lib/authNotifications';

type UserOption = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
};

function formatName(firstName: string | null, lastName: string | null) {
  return `${firstName || ''} ${lastName || ''}`.trim();
}

function createEmptyRoles(): Record<RequestBranch, RequestRole[]> {
  return {
    legal: [],
    repo: [],
    petty: [],
    advances: [],
  };
}

export default function AssignmentPage() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<AuthNotification[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<RequestBranch[]>([]);
  const [selectedRolesByBranch, setSelectedRolesByBranch] =
    useState<Record<RequestBranch, RequestRole[]>>(createEmptyRoles);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');

        if (res.status === 401) {
          router.push('/login');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(
            data.filter((user: UserOption) => user.is_admin !== true)
          );
        }
      } catch (err) {
        console.error('Failed to fetch assignment users:', err);
        pushToast({
          tone: 'error',
          title: 'Load failed',
          message: 'Failed to load users for batch assignment.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [pushToast, router]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.user_id)),
    [selectedUserIds, users]
  );

  const selectedUserNameMap = useMemo(
    () =>
      new Map(
        selectedUsers.map((user) => [
          user.user_id,
          formatName(user.first_name, user.last_name) || user.user_id,
        ])
      ),
    [selectedUsers]
  );

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) =>
      formatName(user.first_name, user.last_name).toLowerCase().includes(term)
    );
  }, [userSearch, users]);

  const generatedRows = useMemo(() => {
    return buildUserPermissionRows(
      selectedUserIds,
      selectedBranches.map((branch) => ({
        request_branch: branch,
        request_roles: selectedRolesByBranch[branch] || [],
      }))
    );
  }, [selectedBranches, selectedRolesByBranch, selectedUserIds]);

  const hasRoleSelectionError = selectedBranches.some(
    (branch) => (selectedRolesByBranch[branch] || []).length === 0
  );

  const canSubmit =
    selectedUserIds.length > 0 &&
    selectedBranches.length > 0 &&
    !hasRoleSelectionError &&
    generatedRows.length > 0 &&
    !submitting;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const removeUserChip = (userId: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const toggleBranch = (branch: RequestBranch) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches((prev) => prev.filter((item) => item !== branch));
      setSelectedRolesByBranch((prev) => ({ ...prev, [branch]: [] }));
      return;
    }

    setSelectedBranches((prev) => [...prev, branch]);
  };

  const toggleRole = (branch: RequestBranch, role: RequestRole) => {
    setSelectedRolesByBranch((prev) => {
      const current = prev[branch] || [];
      const nextRoles = current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role];

      if (!selectedBranches.includes(branch) && nextRoles.length > 0) {
        setSelectedBranches((branches) =>
          branches.includes(branch) ? branches : [...branches, branch]
        );
      }

      return {
        ...prev,
        [branch]: nextRoles,
      };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (selectedUserIds.length === 0) {
      pushToast({
        tone: 'error',
        title: 'Missing users',
        message: 'Select at least one user before saving the batch.',
      });
      return;
    }

    if (selectedBranches.length === 0) {
      pushToast({
        tone: 'error',
        title: 'Missing branches',
        message: 'Select at least one request branch before saving the batch.',
      });
      return;
    }

    if (hasRoleSelectionError) {
      pushToast({
        tone: 'error',
        title: 'Missing roles',
        message: 'Select at least one role for every selected request branch.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/utilities/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          assignments: selectedBranches.map((branch) => ({
            request_branch: branch,
            request_roles: selectedRolesByBranch[branch] || [],
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to save permission assignments.');
      }

      pushToast({
        tone: 'message',
        title: 'Assignment saved',
        message: `Created ${data.inserted || generatedRows.length} permission rows successfully.`,
      });
      setSelectedUserIds([]);
      setSelectedBranches([]);
      setSelectedRolesByBranch(createEmptyRoles());
      setUserSearch('');
      setIsDropdownOpen(false);
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Assignment failed',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to save permission assignments. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-15">
      <NotificationStack notifications={notifications} onDismiss={dismissToast} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="section-label">Utilities</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Batch Role Assignment
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Assign request branches and roles to multiple users in one submission. Each selected
            user receives one row per branch and role combination.
          </p>
        </div>

        <Link
          href="/utilities/accounts"
          className="btn-secondary inline-flex items-center gap-2 px-4 py-3"
        >
          <Users className="h-4 w-4" />
          Back to Accounts
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-card space-y-5 p-6">
          <div className="space-y-1">
            <p className="section-label">Target Users</p>
            <h2 className="font-display text-xl font-semibold text-foreground">Select Users</h2>
            <p className="text-sm text-muted-foreground">
              Search by first name or last name, then select or deselect multiple users.
            </p>
          </div>

          <div ref={dropdownRef} className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setIsDropdownOpen((prev) => !prev);
                }
              }}
              className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/75 px-4 py-3 text-left shadow-sm backdrop-blur-xl transition-colors hover:border-primary/25 hover:bg-background/85 dark:border-white/10 dark:bg-background/75 dark:hover:border-primary/30 dark:hover:bg-background/90"
            >
              <div className="flex flex-wrap items-center gap-2 pr-2">
                {selectedUsers.length > 0 ? (
                  selectedUsers.map((user) => {
                    const name = formatName(user.first_name, user.last_name);

                    return (
                      <span
                        key={user.user_id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {name || user.user_id}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeUserChip(user.user_id);
                          }}
                          className="rounded-full p-0.5 transition-colors hover:bg-primary/15"
                          aria-label={`Remove ${name || user.user_id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground">Search and select users</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedUsers.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {selectedUsers.length} selected
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {isDropdownOpen && (
              <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-border/60 bg-background/90 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-background/90">
                <div className="border-b border-border/50 p-2 dark:border-white/10">
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/75 px-3 py-2 dark:border-white/10 dark:bg-background/75">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Search users..."
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-1">
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No assignable users found</div>
                  ) : (
                    filteredUsers.map((user) => {
                      const selected = selectedUserIds.includes(user.user_id);
                      const name = formatName(user.first_name, user.last_name);

                      return (
                        <button
                          key={user.user_id}
                          type="button"
                          onClick={() => toggleUser(user.user_id)}
                          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                            selected
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground hover:bg-muted/70'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{name || user.user_id}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.user_id}</p>
                          </div>
                          {selected && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/60 p-4 dark:bg-background/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Selected Users</p>
                <p className="text-xs text-muted-foreground">
                  {selectedUsers.length} user{selectedUsers.length === 1 ? '' : 's'} selected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedUsers.length > 0 ? (
                selectedUsers.map((user) => {
                  const name = formatName(user.first_name, user.last_name);

                  return (
                    <span
                      key={user.user_id}
                      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground dark:bg-background/60"
                    >
                      {name || user.user_id}
                      <button
                        type="button"
                        onClick={() => removeUserChip(user.user_id)}
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Remove ${name || user.user_id}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No users selected yet.</p>
              )}
            </div>
          </div>
        </section>

        <RequestBranchRolesPanel
          selectedBranches={selectedBranches}
          selectedRolesByBranch={selectedRolesByBranch}
          onToggleBranch={toggleBranch}
          onToggleRole={toggleRole}
        />
      </div>

      <section className="glass-card space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-label">Submission Preview</p>
            <h2 className="font-display text-xl font-semibold text-foreground">Generated Rows</h2>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
              {selectedUserIds.length} users
            </span>
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
              {selectedBranches.length} branches
            </span>
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
              {generatedRows.length} rows
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/60 p-4 dark:bg-background/60">
          {generatedRows.length > 0 ? (
            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
              {generatedRows.slice(0, 9).map((row, index) => (
                <div
                  key={`${row.user_id}-${row.request_branch}-${row.request_role}-${index}`}
                  className="rounded-xl border border-border/60 bg-background/80 px-3 py-3 text-foreground dark:bg-background/60"
                >
                  <p className="font-medium">{selectedUserNameMap.get(row.user_id) || row.user_id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRequestBranch(row.request_branch)} - {formatRequestRole(row.request_role)}
                  </p>
                </div>
              ))}
              {generatedRows.length > 9 && (
                <div className="rounded-xl border border-dashed border-border/60 bg-background/50 px-3 py-3 text-sm text-muted-foreground dark:bg-background/55">
                  +{generatedRows.length - 9} more rows
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Choose users, branches, and roles to preview the rows that will be created.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Each selected user will receive a row for every branch and role combination.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary inline-flex items-center gap-2 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save Permission Batch
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
