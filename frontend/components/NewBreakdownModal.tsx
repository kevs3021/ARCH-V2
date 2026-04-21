// components/requests/NewBreakdownModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Plus, Check, Search, ChevronDown } from 'lucide-react';

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  is_admin?: boolean;
  permissions?: Array<{
    request_branch: string;
    request_roles: string[];
  }>;
}

interface NewBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
}

function ApproverDropdown({
  users,
  selectedApprovers,
  onToggle,
  isLoading,
}: {
  users: User[];
  selectedApprovers: string[];
  onToggle: (userId: string) => void;
  isLoading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredUsers = users.filter(
    (u) =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUsers = users.filter((u) => selectedApprovers.includes(u.user_id));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Approvers <span className="text-destructive">*</span>
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="input-field w-full flex items-center justify-between select-none rounded-sm min-w-0"
      >
        <span className={selectedUsers.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedUsers.length > 0
            ? selectedUsers.map((u) => `${u.first_name} ${u.last_name}`).join(', ')
            : 'Select approvers'}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 dropdown-panel border border-border/50 rounded-sm shadow-lg max-h-60 overflow-hidden bg-background">
          <div className="p-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search approvers..."
                className="w-full bg-transparent border-none outline-none text-sm text-foreground rounded-sm"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            {filteredUsers.length === 0 ? (
              <div className="p-3 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking for approvers...
                  </>
                ) : (
                  'No approvers found'
                )}
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedApprovers.includes(u.user_id);
                return (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => {
                      onToggle(u.user_id);
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-left text-sm ${
                      isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'border border-border'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                     <span className="flex-1 truncate">
                       {u.first_name} {u.last_name}
                     </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ParticularsDropdown({
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Particulars {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          className={`input-field w-full flex items-center justify-between select-none rounded-sm min-w-0 ${!value && required ? 'border-destructive' : ''}`}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className={`truncate ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
            {value || placeholder}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {value && (
              <X
                className="w-4 h-4 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 dropdown-panel border border-border/50 rounded-sm shadow-lg max-h-80 overflow-hidden bg-background">
            <div className="p-2 border-b border-border/50" style={{ minHeight: '44px' }}>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent border-none outline-none text-sm text-foreground rounded-sm"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-sm">No results found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt === value;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-sm hover:bg-primary/10 text-sm ${isSelected ? 'font-semibold text-primary' : 'text-foreground'}`}
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                        setSearch('');
                      }}
                    >
                      {opt}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewBreakdownModal({ isOpen, onClose, requestId }: NewBreakdownModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [particularsList, setParticularsList] = useState<string[]>([]);

  const [form, setForm] = useState({
    particulars: '',
    amount: '',
    purpose: '',
    store: '',
  });

  useEffect(() => {
    let cancelled = false;
    if (isOpen) {
      fetch('/api/utilities/ledger?type=particulars')
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) {
            const names = data.filter((p: any) => p.name).map((p: any) => p.name);
            setParticularsList(names);
          }
        })
        .catch(() => {});

      setIsLoadingUsers(true);
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) {
            console.log('[NewBreakdownModal] All users:', data);
            const approvers = data.filter((u: any) => {
              if (!u.permissions || !Array.isArray(u.permissions)) {
                console.log('[NewBreakdownModal] Skipping user - no permissions:', u);
                return false;
              }
              const hasAdvancesApprover = u.permissions.some((perm: any) => {
                const branchMatch = perm.request_branch?.toLowerCase() === 'advances';
                const hasApprover = Array.isArray(perm.request_roles) &&
                  perm.request_roles.some((r: string) => r.toLowerCase() === 'approver');
                console.log('[NewBreakdownModal] Permission check:', u.first_name, perm.request_branch, perm.request_roles, branchMatch, hasApprover);
                return branchMatch && hasApprover;
              });
              console.log('[NewBreakdownModal] User', u.first_name, 'result:', hasAdvancesApprover);
              return hasAdvancesApprover;
            });
            console.log('[NewBreakdownModal] Filtered approvers:', approvers);
            setUsers(approvers);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoadingUsers(false);
        });
    }
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const toggleApprover = useCallback((userId: string) => {
    setSelectedApprovers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (selectedApprovers.length === 0) {
      setError('Please select at least one approver');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/breakdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          particulars: form.particulars,
          amount: form.amount ? parseFloat(form.amount) : null,
          purpose: form.purpose || null,
          store: form.store || null,
          approver_ids: selectedApprovers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create breakdown');
      }

      onClose();
      setForm({ particulars: '', amount: '', purpose: '', store: '' });
      setSelectedApprovers([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 glass-card p-6 rounded-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">New Breakdown</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-container/80 rounded-sm">
            <p className="text-on-error-container text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <ParticularsDropdown
            value={form.particulars}
            onChange={(value) => setForm((prev) => ({ ...prev, particulars: value }))}
            options={particularsList}
            placeholder="Select Particulars"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Amount</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={handleChange}
                className="input-field rounded-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Store</label>
              <input
                name="store"
                value={form.store}
                onChange={handleChange}
                className="input-field rounded-sm"
                placeholder="Store name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Purpose</label>
            <textarea
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              className="input-field min-h-[60px] resize-none rounded-sm"
              placeholder="Purpose of this breakdown..."
            />
          </div>

          {/* Approvers - Searchable Dropdown */}
          <ApproverDropdown users={users} selectedApprovers={selectedApprovers} onToggle={toggleApprover} isLoading={isLoadingUsers} />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Breakdown'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
