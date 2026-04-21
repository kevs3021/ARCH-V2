'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Edit, Check, ChevronDown } from 'lucide-react';
import {
  REQUEST_BRANCHES,
  formatRequestBranch,
  formatRequestRole,
  getAllowedRequestRolesForBranch,
  type RequestBranch,
  type RequestRole,
} from '@/lib/utilities/assignment';

interface UserPermission {
  request_branch: RequestBranch;
  request_roles: RequestRole[];
}

interface UserAccount {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  branch: string | null;
  campaign: string | null;
  status: string | null;
  permissions?: UserPermission[];
}

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount;
  onSuccess?: () => void;
}

interface BranchOption {
  id: string;
  branch: string;
}

interface CampaignOption {
  id: string;
  campaign_name: string;
}

export default function EditAccountModal({ isOpen, onClose, user, onSuccess }: EditAccountModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);
  const campaignRef = useRef<HTMLDivElement>(null);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [branchesRes, campaignsRes] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/campaigns'),
        ]);
        const branchesData = await branchesRes.json();
        const campaignsData = await campaignsRes.json();
        if (Array.isArray(branchesData)) setBranches(branchesData);
        if (Array.isArray(campaignsData)) setCampaigns(campaignsData);
      } catch (err) {
        console.error('Failed to fetch options:', err);
      }
    }
    fetchOptions();
  }, []);

  const [form, setForm] = useState({
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    branch: user.branch ?? '',
    campaign: user.campaign ?? '',
  });

  const [selectedBranches, setSelectedBranches] = useState<RequestBranch[]>([]);
  const [selectedRolesByBranch, setSelectedRolesByBranch] = useState<Record<RequestBranch, RequestRole[]>>(() => {
    const initial: Record<RequestBranch, RequestRole[]> = { legal: [], repo: [], petty: [], advances: [] };
    return initial;
  });

  useEffect(() => {
    if (isOpen && user) {
      setForm({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        branch: user.branch ?? '',
        campaign: user.campaign ?? '',
      });

      if (user.permissions && user.permissions.length > 0) {
        const branches: RequestBranch[] = [];
        const rolesByBranch: Record<RequestBranch, RequestRole[]> = { legal: [], repo: [], petty: [], advances: [] };

        user.permissions.forEach((perm) => {
          branches.push(perm.request_branch);
          rolesByBranch[perm.request_branch] = perm.request_roles;
        });

        setSelectedBranches(branches);
        setSelectedRolesByBranch(rolesByBranch);
      } else {
        setSelectedBranches([]);
        setSelectedRolesByBranch({ legal: [], repo: [], petty: [], advances: [] });
      }
      setError('');
    }
  }, [isOpen, user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
      if (campaignRef.current && !campaignRef.current.contains(event.target as Node)) {
        setCampaignDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasRoleSelectionError = useMemo(
    () => selectedBranches.some((branch) => (selectedRolesByBranch[branch] || []).length === 0),
    [selectedBranches, selectedRolesByBranch]
  );

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleBranch = (branch: RequestBranch) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches((prev) => prev.filter((item) => item !== branch));
      setSelectedRolesByBranch((prev) => ({ ...prev, [branch]: [] }));
    } else {
      setSelectedBranches((prev) => [...prev, branch]);
    }
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

      return { ...prev, [branch]: nextRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.first_name.trim()) {
      setError('First name is required.');
      return;
    }

    if (selectedBranches.length === 0) {
      setError('Select at least one request branch with roles.');
      return;
    }

    if (hasRoleSelectionError) {
      setError('Select at least one role for every selected branch.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const assignments = selectedBranches.map((branch) => ({
      request_branch: branch,
      request_roles: selectedRolesByBranch[branch] || [],
    }));

    try {
      const res = await fetch(`/api/utilities/accounts/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name || null,
          branch: form.branch || null,
          campaign: form.campaign || null,
          assignments,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update account');
      }

      router.refresh();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl mx-4 glass-card max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Edit className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Edit Account</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-4 p-4 bg-error-container/80 rounded-xl">
            <p className="text-on-error-container text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                First Name <span className="text-destructive">*</span>
              </label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="input-field"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="input-field"
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div ref={branchRef} className="relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Branch</label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setBranchDropdownOpen((prev) => !prev)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setBranchDropdownOpen((prev) => !prev);
                  }
                }}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/75 px-3 py-2 text-left shadow-sm backdrop-blur-xl transition-colors hover:border-primary/25 hover:bg-background/85 dark:border-white/10 dark:bg-background/80 dark:hover:border-primary/30 dark:hover:bg-background/90"
              >
                <span className={form.branch ? 'text-foreground' : 'text-muted-foreground'}>
                  {form.branch || 'Select branch'}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    branchDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {branchDropdownOpen && (
                <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-border/60 bg-background/90 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-background/90">
                  <div className="max-h-40 overflow-y-auto p-1">
                    {branches.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No branches available</div>
                    ) : (
                      branches.map((branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, branch: branch.branch }));
                            setBranchDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            form.branch === branch.branch
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground hover:bg-muted/70'
                          }`}
                        >
                          <span>{branch.branch}</span>
                          {form.branch === branch.branch && <Check className="h-4 w-4" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div ref={campaignRef} className="relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Campaign</label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setCampaignDropdownOpen((prev) => !prev)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setCampaignDropdownOpen((prev) => !prev);
                  }
                }}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/75 px-3 py-2 text-left shadow-sm backdrop-blur-xl transition-colors hover:border-primary/25 hover:bg-background/85 dark:border-white/10 dark:bg-background/80 dark:hover:border-primary/30 dark:hover:bg-background/90"
              >
                <span className={form.campaign ? 'text-foreground' : 'text-muted-foreground'}>
                  {form.campaign || 'Select campaign'}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    campaignDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {campaignDropdownOpen && (
                <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-border/60 bg-background/90 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-background/90">
                  <div className="max-h-40 overflow-y-auto p-1">
                    {campaigns.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No campaigns available</div>
                    ) : (
                      campaigns.map((campaign) => (
                        <button
                          key={campaign.id}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, campaign: campaign.campaign_name }));
                            setCampaignDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            form.campaign === campaign.campaign_name
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground hover:bg-muted/70'
                          }`}
                        >
                          <span>{campaign.campaign_name}</span>
                          {form.campaign === campaign.campaign_name && <Check className="h-4 w-4" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Request Roles <span className="text-destructive">*</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Select request branches and roles for this user.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {REQUEST_BRANCHES.map((branch) => {
                const selected = selectedBranches.includes(branch);
                const roles = selectedRolesByBranch[branch] || [];

                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => toggleBranch(branch)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                      selected
                        ? 'border-primary/30 bg-primary/10'
                        : 'border-border/60 bg-background/60 text-foreground hover:bg-muted/60 dark:bg-background/55'
                    }`}
                  >
                    <p
                      className={`font-medium ${selected ? 'text-primary' : 'text-foreground'}`}
                    >
                      {formatRequestBranch(branch)}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        selected && roles.length > 0 ? 'text-primary/80' : 'text-muted-foreground'
                      }`}
                    >
                      {roles.length > 0
                        ? roles.map((r) => formatRequestRole(r)).join(', ')
                        : 'No roles selected'}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedBranches.length > 0 && (
              <div className="space-y-3 mt-4">
                {selectedBranches.map((branch) => {
                  const roles = selectedRolesByBranch[branch] || [];

                  return (
                    <div
                      key={branch}
                      className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm backdrop-blur-sm dark:bg-background/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{formatRequestBranch(branch)}</p>
                          <p className="text-xs text-muted-foreground">
                            Choose at least one role for this branch.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleBranch(branch)}
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={`Remove ${branch}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {getAllowedRequestRolesForBranch(branch).map((role) => {
                          const active = roles.includes(role);

                          return (
                            <label
                              key={`${branch}-${role}`}
                              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                                active
                                  ? 'border-primary/30 bg-primary/10 text-primary'
                                  : 'border-border/60 bg-background/60 text-foreground hover:bg-muted/60 dark:bg-background/55'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => toggleRole(branch, role)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span>{formatRequestRole(role)}</span>
                            </label>
                          );
                        })}
                      </div>

                      {roles.length === 0 && (
                        <p className="mt-3 text-xs text-rose-600 dark:text-rose-300">
                          Select at least one role for this branch before submitting.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}