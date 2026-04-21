'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  X,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { AuthNotification } from '@/lib/authNotifications';
import NotificationStack from '@/components/NotificationStack';

type Branch = {
  id: string;
  branch: string;
  branch_code: string;
  branch_doc_class: string;
  created_at: string;
  status: string;
};

type Campaign = {
  id: string;
  bank: string;
  campaign_id: string;
  campaign_name: string;
  company: string;
  status: string;
  created_at: string;
};

type Particular = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

type LedgerType = 'branches' | 'campaigns' | 'particulars';

export default function LedgerPage() {
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [ledgerType, setLedgerType] = useState<LedgerType>('branches');
  const [data, setData] = useState<Branch[] | Campaign[] | Particular[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notifications, setNotifications] = useState<AuthNotification[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [docClass, setDocClass] = useState('');
  const [bank, setBank] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [company, setCompany] = useState('');

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: ledgerType,
        search: search,
      });
      const res = await fetch(`/api/utilities/ledger?${params}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      pushToast({
        tone: 'error',
        title: 'Load failed',
        message: `Failed to load ${ledgerType}.`,
      });
    } finally {
      setLoading(false);
    }
  }, [ledgerType, search, pushToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!name.trim()) {
      pushToast({
        tone: 'error',
        title: 'Validation Error',
        message: 'Name is required.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/utilities/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: ledgerType,
          name: name.trim(),
          code: ledgerType === 'branches' ? code.trim() : undefined,
          docClass: ledgerType === 'branches' ? docClass.trim() : undefined,
          bank: ledgerType === 'campaigns' ? bank.trim() : undefined,
          campaignId: ledgerType === 'campaigns' ? campaignId.trim() : undefined,
          company: ledgerType === 'campaigns' ? company.trim() : undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create');
      }

      pushToast({
        tone: 'message',
        title: 'Created successfully',
        message: `${ledgerType === 'branches' ? 'Branch' : ledgerType === 'campaigns' ? 'Campaign' : 'Particular'} has been created.`,
      });
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Create failed',
        message: err instanceof Error ? err.message : 'Unable to create. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'active' || currentStatus === 'Active'
      ? 'disable'
      : 'enable';

    console.log(`Attempting to ${action} item:`, { id, currentStatus, ledgerType });

    setSubmitting(true);
    try {
      const res = await fetch('/api/utilities/ledger', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: ledgerType,
          id: id,
          action: action,
        }),
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || `Failed to ${action}`);
      }

      const json = await res.json();
      console.log(`Successfully ${action}d:`, json);

      pushToast({
        tone: 'message',
        title: action === 'disable' ? 'Disabled' : 'Reactivated',
        message: `Record has been ${action === 'disable' ? 'disabled' : 'reactivated'}.`,
      });
      fetchData();
    } catch (err) {
      console.error('Disable/Enable error:', err);
      pushToast({
        tone: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Unable to update. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setDocClass('');
    setBank('');
    setCampaignId('');
    setCompany('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const isActive = (status: string) => {
    return status && typeof status === 'string' && status.toLowerCase() === 'active';
  };

  return (
    <div className="space-y-6">
      <NotificationStack notifications={notifications} onDismiss={dismissToast} />
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="section-label">Utilities</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Ledger Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage branches, campaigns, and particulars masterlist
          </p>
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search by ${ledgerType === 'branches' ? 'branch' : ledgerType === 'campaigns' ? 'campaign name' : 'particular name'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-full pl-10 pr-4"
              />
            </div>
          </div>

          <div className="relative">
            <select
              value={ledgerType}
              onChange={(e) => setLedgerType(e.target.value as LedgerType)}
              className="input-field appearance-none pr-10 min-w-[180px]"
            >
              <option value="branches">Branches</option>
              <option value="campaigns">Campaigns</option>
              <option value="particulars">Particulars</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary inline-flex items-center gap-2 px-4 py-3 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Create New
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                  {ledgerType === 'branches' ? 'Branch' : ledgerType === 'campaigns' ? 'Campaign Name' : 'Particular Name'}
                </th>
                {ledgerType === 'branches' && (
                  <>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Code
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Doc Class
                    </th>
                  </>
                )}
                {ledgerType === 'campaigns' && (
                  <>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Bank
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Company
                    </th>
                  </>
                )}
                {ledgerType === 'particulars' && (
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Created At
                  </th>
                )}
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Status
                </th>

              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={ledgerType === 'particulars' ? 3 : 5} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={ledgerType === 'particulars' ? 3 : 5} className="py-12 text-center text-muted-foreground">
                    No {ledgerType} found
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/40 table-row-hover"
                  >
                    <td className="py-3 px-4 text-sm text-foreground">
                      <span className={!isActive(item.status) ? 'text-muted-foreground line-through' : ''}>
                        {ledgerType === 'branches'
                          ? (item as Branch).branch
                          : ledgerType === 'campaigns'
                          ? (item as Campaign).campaign_name
                          : (item as Particular).name}
                      </span>
                    </td>
                    {ledgerType === 'branches' && (
                      <>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {(item as Branch).branch_code || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {(item as Branch).branch_doc_class || '-'}
                        </td>
                      </>
                    )}
                    {ledgerType === 'campaigns' && (
                      <>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {(item as Campaign).bank || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {(item as Campaign).company || '-'}
                        </td>
                      </>
                    )}
                    {ledgerType === 'particulars' && (
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date((item as Particular).created_at).toLocaleDateString()}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleDisable(item.id, item.status)}
                        disabled={submitting}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${
                          isActive(item.status)
                            ? 'bg-emerald-100/60 text-emerald-800 dark:bg-emerald-200/30 dark:text-emerald-500'
                            : 'bg-slate-50/60 text-slate-300 dark:bg-slate-800/30 dark:text-slate-500'
                        }`}
                      >
                        {isActive(item.status) ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {item.status || 'Unknown'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative glass-card w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Create New {ledgerType === 'branches' ? 'Branch' : ledgerType === 'campaigns' ? 'Campaign' : 'Particular'}
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    ledgerType === 'branches'
                      ? 'Enter branch name'
                      : ledgerType === 'campaigns'
                      ? 'Enter campaign name'
                      : 'Enter particular name'
                  }
                  className="input-field"
                />
              </div>

              {ledgerType === 'branches' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Enter branch code"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Document Class
                    </label>
                    <input
                      type="text"
                      value={docClass}
                      onChange={(e) => setDocClass(e.target.value)}
                      placeholder="Enter document class"
                      className="input-field"
                    />
                  </div>
                </>
              )}

              {ledgerType === 'campaigns' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Bank</label>
                    <input
                      type="text"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      placeholder="Enter bank name"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Campaign ID
                    </label>
                    <input
                      type="text"
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      placeholder="Enter campaign ID"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Company</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Enter company name"
                      className="input-field"
                    />
                  </div>
                </>
              )}

              {ledgerType === 'particulars' && null}
            </div>

<div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary flex-1 px-4 py-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting || !name.trim()}
                className="btn-primary flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}