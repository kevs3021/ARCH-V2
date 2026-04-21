// components/requests/BreakdownsList.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Check, X, Circle, CheckCircle2, Pencil, ShoppingBag, Target } from 'lucide-react';
import EditBreakdownModal from './EditBreakdownModal';
import NewBreakdownModal from './NewBreakdownModal';

function formatAmount(amount?: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount);
}

function getOverallStatus(approvers: { status: string }[]): { label: string; color: string; bgColor: string } {
  if (!approvers || approvers.length === 0) return { label: 'No Approvers', color: 'hsl(258 20% 50%)', bgColor: 'hsl(258 40% 92%)' };
  if (approvers.some((a) => a.status === 'Rejected')) return { label: 'Rejected', color: 'hsl(0 84% 60%)', bgColor: 'hsl(0 84% 96%)' };
  if (approvers.every((a) => a.status === 'Approved')) return { label: 'Approved', color: 'hsl(142 76% 36%)', bgColor: 'hsl(142 76% 96%)' };
  return { label: 'Pending', color: 'hsl(258 20% 50%)', bgColor: 'hsl(258 40% 92%)' };
}

function ApproverBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
    Pending: { icon: <Circle className="w-3.5 h-3.5 fill-current" />, color: 'hsl(258 20% 50%)', bgColor: 'hsl(258 40% 92%)' },
    Approved: { icon: <Check className="w-3.5 h-3.5" />, color: 'hsl(142 76% 36%)', bgColor: 'hsl(142 76% 96%)' },
    Rejected: { icon: <X className="w-3.5 h-3.5" />, color: 'hsl(0 84% 60%)', bgColor: 'hsl(0 84% 96%)' },
  };
  const c = config[status] || config.Pending;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full" style={{ color: c.color, backgroundColor: c.bgColor }}>
      {c.icon}
      <span className="capitalize">{status.toLowerCase()}</span>
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

function normalizeRequestStatus(status: string) {
  return status.replace(/\s+/g, '_').toLowerCase();
}

export default function BreakdownsList({ data, requestId, currentUserId, requestStatus, effectiveRole }: BreakdownsListProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isNewBreakdownOpen, setIsNewBreakdownOpen] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState<string | null>(null);
  const [loadingRecorded, setLoadingRecorded] = useState<string | null>(null);
  const [editingBreakdown, setEditingBreakdown] = useState<Breakdown | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const total = data.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const breakdownCount = data.length;
  const ns = normalizeRequestStatus(requestStatus);
  const canAddOrEdit = (effectiveRole === 'requestor' || effectiveRole === 'admin') && ns === 'open';
  const canApproveReject = (effectiveRole === 'approver' || effectiveRole === 'admin') && ns === 'for_approval';
  const isAccounting = effectiveRole === 'accounting';

  const handleAction = useCallback(async (breakdownId: string, action: 'approve' | 'reject') => {
    setLoadingApprove(breakdownId + action);
    try {
      await fetch(`/api/breakdowns/${encodeURIComponent(breakdownId)}/${action}`, { method: 'PATCH' });
      router.refresh();
    } catch (err) { console.error(err); }
    finally { setLoadingApprove(null); }
  }, [router]);

  const handleRecordedToggle = useCallback(async (breakdownId: string) => {
    if (!isAccounting) return;
    setLoadingRecorded(breakdownId);
    try {
      await fetch(`/api/breakdowns/${encodeURIComponent(breakdownId)}/recorded`, { method: 'PATCH' });
      router.refresh();
    } catch (err) { console.error(err); }
    finally { setLoadingRecorded(null); }
  }, [router, isAccounting]);

  const handleEditClick = useCallback((e: React.MouseEvent, breakdown: Breakdown) => {
    e.stopPropagation();
    setEditingBreakdown(breakdown);
    setIsEditOpen(true);
  }, []);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <p className="section-label">Breakdowns</p>
          <p className="text-2xl font-bold" style={{ color: 'hsl(228 64% 47%)' }}>
            {formatAmount(total)} · {breakdownCount} item{breakdownCount !== 1 ? 's' : ''}
          </p>
        </div>
        {canAddOrEdit && (
          <button
            type="button"
            onClick={() => setIsNewBreakdownOpen(true)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ 
              backgroundColor: 'hsl(289 63% 47% / 0.1)',
              color: 'hsl(228 64% 47%)'
            }}
            aria-label="Open add breakdown modal"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {canAddOrEdit && (
        <NewBreakdownModal
          isOpen={isNewBreakdownOpen}
          onClose={() => setIsNewBreakdownOpen(false)}
          requestId={requestId}
        />
      )}

      {editingBreakdown && (
        <EditBreakdownModal
          isOpen={isEditOpen}
          onClose={() => { setIsEditOpen(false); setEditingBreakdown(null); }}
          breakdown={editingBreakdown}
        />
      )}

      {data.length === 0 ? (
        <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: 'hsl(258 40% 92% / 0.5)' }}>
          <p className="text-base" style={{ color: 'hsl(258 20% 50%)' }}>No breakdowns yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((breakdown) => {
            const isExpanded = expandedId === breakdown.breakdown_id;
            const overall = getOverallStatus(breakdown.breakdown_approvers || []);
            const isPendingBreakdown = !breakdown.status || breakdown.status.toLowerCase() === 'pending';
            return (
              <div 
                key={breakdown.breakdown_id} 
                className={`rounded-2xl overflow-hidden transition-all duration-300 border border-white/50 shadow-sm hover:shadow-md ${isExpanded ? "shadow-lg" : ""}`}
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.42)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)'
                }}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {isAccounting && (
                    <button
                      type="button"
                      onClick={() => handleRecordedToggle(breakdown.breakdown_id)}
                      disabled={loadingRecorded === breakdown.breakdown_id}
                      className="cursor-pointer p-1.5 rounded-xl transition-colors hover:bg-white/60"
                      title={breakdown.recorded ? 'Recorded' : 'Not recorded'}
                      aria-label={breakdown.recorded ? 'Mark breakdown as not recorded' : 'Mark breakdown as recorded'}
                    >
                      {loadingRecorded === breakdown.breakdown_id
                        ? <div className="w-6 h-6 border-2 border-[#2E7D32]/30 border-t-[#2E7D32] rounded-full animate-spin" />
                        : breakdown.recorded
                          ? <CheckCircle2 className="w-6 h-6 text-[#2E7D32]" />
                          : <Circle className="w-6 h-6" style={{ color: 'hsl(258 20% 50%)' }} />}
                    </button>
                  )}
                  {!isAccounting && <div className="w-6" />}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : breakdown.breakdown_id)}
                    className="flex-1 flex items-center gap-4 text-left transition-colors rounded-xl py-2 hover:bg-white/40"
                    aria-expanded={isExpanded}
                    aria-controls={`breakdown-details-${breakdown.breakdown_id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold" style={{ color: 'hsl(258 40% 18%)' }}>{breakdown.particulars || 'Untitled'}</p>
                    </div>
                    <span className="text-sm font-medium px-4 py-1.5 rounded-full flex-shrink-0" style={{ color: overall.color, backgroundColor: overall.bgColor }}>
                      {overall.label}
                    </span>
                    <p className="text-xl font-bold flex-shrink-0" style={{ color: 'hsl(228 64% 47%)' }}>{formatAmount(breakdown.amount)}</p>
                    {isExpanded
                      ? <ChevronUp className="w-6 h-6 flex-shrink-0" style={{ color: 'hsl(228 64% 47%)' }} />
                      : <ChevronDown className="w-6 h-6 flex-shrink-0" style={{ color: 'hsl(258 20% 50%)' }} />}
                  </button>
                  {canAddOrEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleEditClick(e, breakdown)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/70 hover:scale-105 active:scale-95"
                      style={{ 
                        backgroundColor: 'hsl(258 40% 92%)',
                        color: 'hsl(258 20% 50%)'
                      }}
                      title="Edit breakdown"
                      aria-label="Edit breakdown"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div id={`breakdown-details-${breakdown.breakdown_id}`} className="px-5 pb-5 pt-3 border-t border-white/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {breakdown.purpose && (
                        <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4" style={{ color: 'hsl(228 64% 47%)' }} />
                            <p className="section-label">Purpose</p>
                          </div>
                          <p className="text-base font-medium" style={{ color: 'hsl(258 40% 18%)' }}>{breakdown.purpose}</p>
                        </div>
                      )}
                      {breakdown.store && (
                        <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <ShoppingBag className="w-4 h-4" style={{ color: 'hsl(228 64% 47%)' }} />
                            <p className="section-label">Store</p>
                          </div>
                          <p className="text-base font-medium" style={{ color: 'hsl(258 40% 18%)' }}>{breakdown.store}</p>
                        </div>
                      )}
                    </div>
                    {breakdown.breakdown_approvers && breakdown.breakdown_approvers.length > 0 && (
                      <div className="mt-4">
                        <p className="section-label mb-3">Approvers</p>
                        <div className="space-y-3">
                          {breakdown.breakdown_approvers.map((approver) => {
                            const name = approver.approver
                              ? `${approver.approver.first_name} ${approver.approver.last_name}`
                              : 'Unknown';
                            const approverId = approver.requestor_id;
                            const approverStatus = approver.status ? approver.status.replace(/\s+/g, '_').toLowerCase() : '';
                            const isSelf = approverId === currentUserId && approverStatus === 'pending';
                            const showApproveReject = canApproveReject && isSelf && isPendingBreakdown;
                            return (
                              <div 
                                key={`${approverId}-${approver.status}-${approver.approved_at ?? 'none'}`} 
                                className="flex items-center gap-4 rounded-xl p-4"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                              >
                                <ApproverBadge status={approver.status} />
                                <span className="text-base font-medium" style={{ color: 'hsl(258 40% 18%)' }}>{name}</span>
                                {showApproveReject && (
                                  <div className="flex items-center gap-2 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => handleAction(breakdown.breakdown_id, 'approve')}
                                      disabled={loadingApprove !== null}
                                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                                      style={{ backgroundColor: 'hsl(142 76% 36% / 0.15)', color: 'hsl(142 76% 36%)' }}
                                      aria-label="Approve breakdown"
                                    >
                                      {loadingApprove === breakdown.breakdown_id + 'approve'
                                        ? <div className="w-5 h-5 border-2 border-[#2E7D32]/30 border-t-[#2E7D32] rounded-full animate-spin" />
                                        : <Check className="w-5 h-5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAction(breakdown.breakdown_id, 'reject')}
                                      disabled={loadingApprove !== null}
                                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                                      style={{ backgroundColor: 'hsl(0 84% 60% / 0.15)', color: 'hsl(0 84% 60%)' }}
                                      aria-label="Reject breakdown"
                                    >
                                      {loadingApprove === breakdown.breakdown_id + 'reject'
                                        ? <div className="w-5 h-5 border-2 border-[#D32F2F]/30 border-t-[#D32F2F] rounded-full animate-spin" />
                                        : <X className="w-5 h-5" />}
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
    </div>
  );
}