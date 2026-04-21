import os

content = """\
// components/requests/BreakdownsList.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Check, X, Circle, CheckCircle2, Pencil, Loader2 } from 'lucide-react';
import EditBreakdownModal from './EditBreakdownModal';

function formatAmount(amount?: number | null) {
  if (amount == null) return '\\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount);
}

function getOverallStatus(approvers: { status: string }[]): { label: string; color: string; bgColor: string } {
  if (!approvers || approvers.length === 0) return { label: 'No Approvers', color: '#79747E', bgColor: '#E8E8E8' };
  if (approvers.some((a) => a.status === 'Rejected')) return { label: 'Rejected', color: '#D32F2F', bgColor: '#FFCDD2' };
  if (approvers.every((a) => a.status === 'Approved')) return { label: 'Approved', color: '#2E7D32', bgColor: '#E8F5E9' };
  return { label: 'Pending', color: '#79747E', bgColor: '#E8E8E8' };
}

function ApproverBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
    Pending: { icon: <Circle className="w-3 h-3 fill-current" />, color: '#79747E', bgColor: '#E8E8E8' },
    Approved: { icon: <Check className="w-3 h-3" />, color: '#2E7D32', bgColor: '#E8F5E9' },
    Rejected: { icon: <X className="w-3 h-3" />, color: '#D32F2F', bgColor: '#FFCDD2' },
  };
  const c = config[status] || config.Pending;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: c.color, backgroundColor: c.bgColor }}>
      {c.icon}
    </span>
  );
}

interface BreakdownApprovers {
  requestor_id: string;
  status: string;
  approved_at: string | null;
  approver: { first_name: string; last_name: string } | null;
}

interface Breakdown {
  breakdown_id: string;
  particulars: string;
  amount: number | null;
  purpose: string | null;
  store: string | null;
  status: string | null;
  recorded: boolean;
  breakdown_approvers: BreakdownApprovers[] | null;
}

interface BreakdownsListProps {
  data: Breakdown[];
  requestId: string;
  currentUserId: string;
  requestStatus: string;
  effectiveRole: string;
}

const EMPTY_FORM = { particulars: '', amount: '', purpose: '', store: '' };

export default function BreakdownsList({ data, requestId, currentUserId, requestStatus, effectiveRole }: BreakdownsListProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState<string | null>(null);
  const [loadingRecorded, setLoadingRecorded] = useState<string | null>(null);
  const [editingBreakdown, setEditingBreakdown] = useState<Breakdown | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const total = data.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const ns = requestStatus.toLowerCase();
  const canAddOrEdit = (effectiveRole === 'requestor' || effectiveRole === 'admin') && ns === 'open';
  const canApproveReject = (effectiveRole === 'approver' || effectiveRole === 'admin') && ns === 'for_approval';
  const isAccounting = effectiveRole === 'accounting' || effectiveRole === 'admin';

  const handleAction = async (breakdownId: string, action: 'approve' | 'reject') => {
    setLoadingApprove(breakdownId + action);
    try {
      await fetch(`/api/breakdowns/${encodeURIComponent(breakdownId)}/${action}`, { method: 'PATCH' });
      router.refresh();
    } catch (err) { console.error(err); }
    finally { setLoadingApprove(null); }
  };

  const handleRecordedToggle = async (breakdownId: string) => {
    if (!isAccounting) return;
    setLoadingRecorded(breakdownId);
    try {
      await fetch(`/api/breakdowns/${encodeURIComponent(breakdownId)}/recorded`, { method: 'PATCH' });
      router.refresh();
    } catch (err) { console.error(err); }
    finally { setLoadingRecorded(null); }
  };

  const handleEditClick = (e: React.MouseEvent, breakdown: Breakdown) => {
    e.stopPropagation();
    setEditingBreakdown(breakdown);
    setIsEditOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.particulars.trim()) { setAddError('Particulars is required'); return; }
    setIsAdding(true);
    setAddError('');
    try {
      const res = await fetch('/api/breakdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          particulars: addForm.particulars.trim(),
          amount: addForm.amount ? parseFloat(addForm.amount) : null,
          purpose: addForm.purpose || null,
          store: addForm.store || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create breakdown');
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setIsAdding(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-label">Total</p>
          <p className="text-lg font-bold text-primary">{formatAmount(total)}</p>
        </div>
        {canAddOrEdit && (
          <button
            onClick={() => { setShowAddForm((v) => !v); setAddError(''); }}
            className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
      </div>

      {canAddOrEdit && showAddForm && (
        <form onSubmit={handleAddSubmit} className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">New Breakdown</p>
          <div>
            <input
              value={addForm.particulars}
              onChange={(e) => setAddForm((f) => ({ ...f, particulars: e.target.value }))}
              className="input-field w-full"
              placeholder="Particulars *"
              autoFocus
            />
            {addError && <p className="mt-1 text-xs text-red-500">{addError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number" step="0.01" min="0"
              value={addForm.amount}
              onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
              className="input-field" placeholder="Amount"
            />
            <input
              value={addForm.store}
              onChange={(e) => setAddForm((f) => ({ ...f, store: e.target.value }))}
              className="input-field" placeholder="Store"
            />
          </div>
          <input
            value={addForm.purpose}
            onChange={(e) => setAddForm((f) => ({ ...f, purpose: e.target.value }))}
            className="input-field w-full" placeholder="Purpose"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); setAddError(''); }}
              className="btn-secondary text-sm py-1.5 px-3"
            >
              Cancel
            </button>
            <button type="submit" disabled={isAdding} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5">
              {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add
            </button>
          </div>
        </form>
      )}

      {data.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No breakdowns yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((breakdown) => {
            const isExpanded = expandedId === breakdown.breakdown_id;
            const overall = getOverallStatus(breakdown.breakdown_approvers || []);
            const isPendingBreakdown = breakdown.status === 'Pending' || breakdown.status === null;
            return (
              <div key={breakdown.breakdown_id} className="rounded-xl bg-muted/40 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    onClick={() => handleRecordedToggle(breakdown.breakdown_id)}
                    disabled={loadingRecorded === breakdown.breakdown_id}
                    className={isAccounting ? 'cursor-pointer' : 'cursor-default'}
                    title={breakdown.recorded ? 'Recorded' : 'Not recorded'}
                  >
                    {loadingRecorded === breakdown.breakdown_id
                      ? <div className="w-4 h-4 border-2 border-[#2E7D32]/30 border-t-[#2E7D32] rounded-full animate-spin" />
                      : breakdown.recorded
                        ? <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                        : <Circle className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : breakdown.breakdown_id)}
                    className="flex-1 flex items-center gap-3 text-left hover:bg-muted/60 transition-colors rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{breakdown.particulars || 'Untitled'}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: overall.color, backgroundColor: overall.bgColor }}>
                      {overall.label}
                    </span>
                    <p className="text-sm font-semibold text-foreground flex-shrink-0">{formatAmount(breakdown.amount)}</p>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {canAddOrEdit && (
                    <button
                      onClick={(e) => handleEditClick(e, breakdown)}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors flex-shrink-0"
                      title="Edit breakdown"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {(breakdown.purpose || breakdown.store) && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {breakdown.purpose && (
                          <div>
                            <p className="section-label mb-0.5">Purpose</p>
                            <p className="text-foreground">{breakdown.purpose}</p>
                          </div>
                        )}
                        {breakdown.store && (
                          <div>
                            <p className="section-label mb-0.5">Store</p>
                            <p className="text-foreground">{breakdown.store}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {breakdown.breakdown_approvers && breakdown.breakdown_approvers.length > 0 && (
                      <div>
                        <p className="section-label mb-2">Approvers</p>
                        <div className="space-y-1.5">
                          {breakdown.breakdown_approvers.map((approver) => {
                            const name = approver.approver
                              ? `${approver.approver.first_name} ${approver.approver.last_name}`
                              : 'Unknown';
                            const isSelf = approver.requestor_id === currentUserId && approver.status === 'Pending';
                            const showApproveReject = canApproveReject && isSelf && isPendingBreakdown;
                            return (
                              <div key={approver.requestor_id} className="flex items-center gap-2">
                                <ApproverBadge status={approver.status} />
                                <span className="text-sm text-foreground">{name}</span>
                                {showApproveReject && (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      onClick={() => handleAction(breakdown.breakdown_id, 'approve')}
                                      disabled={loadingApprove !== null}
                                      className="w-7 h-7 rounded-lg bg-[#2E7D32]/10 flex items-center justify-center text-[#2E7D32] hover:bg-[#2E7D32]/20 transition-colors"
                                    >
                                      {loadingApprove === breakdown.breakdown_id + 'approve'
                                        ? <div className="w-3 h-3 border-2 border-[#2E7D32]/30 border-t-[#2E7D32] rounded-full animate-spin" />
                                        : <Check className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      onClick={() => handleAction(breakdown.breakdown_id, 'reject')}
                                      disabled={loadingApprove !== null}
                                      className="w-7 h-7 rounded-lg bg-[#D32F2F]/10 flex items-center justify-center text-[#D32F2F] hover:bg-[#D32F2F]/20 transition-colors"
                                    >
                                      {loadingApprove === breakdown.breakdown_id + 'reject'
                                        ? <div className="w-3 h-3 border-2 border-[#D32F2F]/30 border-t-[#D32F2F] rounded-full animate-spin" />
                                        : <X className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingBreakdown && (
        <EditBreakdownModal
          isOpen={isEditOpen}
          onClose={() => { setIsEditOpen(false); setEditingBreakdown(null); }}
          breakdown={editingBreakdown}
        />
      )}
    </div>
  );
}
"""

target = os.path.join(os.path.dirname(__file__), '..', 'components', 'BreakdownsList.tsx')
with open(target, 'w', encoding='utf-8') as f:
    f.write(content)
print('written ok')
