// components/requests/LiquidationsList.tsx
'use client';

import { useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import NewLiquidationModal from './NewLiquidationModal';
import LiquidationsMetricsPanel from './LiquidationsMetricsPanel';

function formatAmount(amount?: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Liquidation {
  liquidation_id: string;
  particulars: string | null;
  amount: number | null;
  vendor: string | null;
  created_at: string;
  attachment_url: string | null;
}

interface LiquidationsListProps {
  data: Liquidation[];
  requestId: string;
  requestStatus: string;
  effectiveRole: string;
  requestedAmount: number | null;
}

export default function LiquidationsList({ data, requestId, requestStatus, effectiveRole, requestedAmount }: LiquidationsListProps) {
  const [isNewOpen, setIsNewOpen] = useState(false);

  const total = data.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  const canAddLiquidation = effectiveRole === 'requestor' && requestStatus === 'for_liquidation';

  return (
    <div>
      <LiquidationsMetricsPanel
        liquidationCount={data.length}
        requestedAmount={requestedAmount ?? 0}
        liquidatedTotal={total}
      />

      {/* Header with total and add button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-label">Total</p>
          <p className="text-lg font-bold text-primary">{formatAmount(total)}</p>
        </div>
        {canAddLiquidation && (
          <button
            onClick={() => setIsNewOpen(true)}
            className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No liquidations yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((liquidation) => (
            <div
              key={liquidation.liquidation_id}
              className="py-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-medium text-foreground truncate">
                    {liquidation.particulars || 'Untitled'}
                  </p>
                  {liquidation.vendor && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {liquidation.vendor}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground flex-shrink-0">
                  {formatAmount(liquidation.amount)}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-muted-foreground">
                  {formatDate(liquidation.created_at)}
                </p>
                {liquidation.attachment_url && (
                  <a
                    href={liquidation.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View receipt
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <NewLiquidationModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        requestId={requestId}
      />
    </div>
  );
}
