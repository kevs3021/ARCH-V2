'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { computeLiquidationMetrics } from '@/lib/requestDetailUtils';

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

interface LiquidationsMetricsPanelProps {
  liquidationCount: number;
  requestedAmount: number;
  liquidatedTotal: number;
}

export default function LiquidationsMetricsPanel({
  liquidationCount,
  requestedAmount,
  liquidatedTotal,
}: LiquidationsMetricsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Build a synthetic liquidations array that sums to liquidatedTotal so we can
  // delegate excess/total derivation to computeLiquidationMetrics.
  const metrics = computeLiquidationMetrics(requestedAmount, [{ amount: liquidatedTotal }]);
  // Override count with the real count passed in (the synthetic array has 1 entry)
  const { excess, total } = metrics;

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Liquidation Summary</p>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
          aria-label={collapsed ? 'Expand metrics' : 'Collapse metrics'}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <p className="section-label">Count</p>
            <p className="text-sm font-semibold text-foreground">{liquidationCount}</p>
          </div>
          <div>
            <p className="section-label">Requested</p>
            <p className="text-sm font-semibold text-foreground">{formatAmount(requestedAmount)}</p>
          </div>
          <div>
            <p className="section-label">Liquidated</p>
            <p className="text-sm font-semibold text-foreground">{formatAmount(liquidatedTotal)}</p>
          </div>
          <div>
            <p className="section-label">Excess</p>
            <p
              className="text-sm font-semibold"
              style={{ color: excess < 0 ? '#D32F2F' : excess > 0 ? '#2E7D32' : undefined }}
            >
              {formatAmount(excess)}
            </p>
          </div>
          <div className="col-span-2 pt-2 border-t border-border/40">
            <p className="section-label">Total</p>
            <p className="text-sm font-bold text-primary">{formatAmount(total)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
