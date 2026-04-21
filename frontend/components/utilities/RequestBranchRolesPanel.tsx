'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  REQUEST_BRANCHES,
  formatRequestBranch,
  formatRequestRole,
  getAllowedRequestRolesForBranch,
  type RequestBranch,
  type RequestRole,
} from '@/lib/utilities/assignment';

type RequestBranchRolesPanelProps = {
  selectedBranches: RequestBranch[];
  selectedRolesByBranch: Record<RequestBranch, RequestRole[]>;
  onToggleBranch: (branch: RequestBranch) => void;
  onToggleRole: (branch: RequestBranch, role: RequestRole) => void;
  className?: string;
  description?: string;
  embedded?: boolean;
  showHeader?: boolean;
  title?: string;
};

export default function RequestBranchRolesPanel({
  selectedBranches,
  selectedRolesByBranch,
  onToggleBranch,
  onToggleRole,
  className,
  description = 'Select one or more request branches, then choose at least one role for each branch.',
  embedded = false,
  showHeader = true,
  title = 'Request Branch Roles',
}: RequestBranchRolesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return REQUEST_BRANCHES;
    return REQUEST_BRANCHES.filter((branch) => formatRequestBranch(branch).toLowerCase().includes(term));
  }, [search]);

  const rootClassName = [
    embedded ? 'space-y-5' : 'glass-card p-6 space-y-5',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      {showHeader && (
        <div className="space-y-1">
          <p className="section-label">Assignment Scope</p>
          <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      <div ref={wrapperRef} className="relative">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsOpen((prev) => !prev);
            }
          }}
          className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/75 px-4 py-3 text-left shadow-sm backdrop-blur-xl transition-colors hover:border-primary/25 hover:bg-background/85 dark:border-white/10 dark:bg-background/80 dark:hover:border-primary/30 dark:hover:bg-background/90"
        >
          <div className="flex flex-wrap items-center gap-2 pr-2">
            {selectedBranches.length > 0 ? (
              selectedBranches.map((branch) => (
                <span
                  key={branch}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {formatRequestBranch(branch)}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleBranch(branch);
                    }}
                    className="rounded-full p-0.5 transition-colors hover:bg-primary/15"
                    aria-label={`Remove ${branch}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">Select request branches</span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>

        {isOpen && (
          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-border/60 bg-background/90 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-background/90">
            <div className="border-b border-border/50 p-2 dark:border-white/10">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search request branches..."
                className="w-full rounded-xl border border-border/50 bg-background/75 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground dark:border-white/10 dark:bg-background/75"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filteredBranches.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">No branches found</div>
              ) : (
                filteredBranches.map((branch) => {
                  const selected = selectedBranches.includes(branch);

                  return (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => onToggleBranch(branch)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                        selected
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted/70'
                      }`}
                    >
                      <span>{formatRequestBranch(branch)}</span>
                      {selected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {selectedBranches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-4 text-sm text-muted-foreground dark:bg-background/55">
            Selected branches will appear here with their role checkboxes.
          </div>
        ) : (
          selectedBranches.map((branch) => {
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
                    onClick={() => onToggleBranch(branch)}
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
                          onChange={() => onToggleRole(branch, role)}
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
          })
        )}
      </div>
    </div>
  );
}
