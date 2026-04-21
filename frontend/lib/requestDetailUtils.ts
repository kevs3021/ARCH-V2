import { RequestStatusType } from '@/config/status';

export type EffectiveRole = 'requestor' | 'approver' | 'accounting' | 'admin';

export interface BreakdownsSummary {
  hasApprovedOrRejected: boolean;
}

/**
 * Returns the permitted target statuses for a given role, current status, and breakdowns state.
 *
 * Role/status transition matrix for Advanced Request workflow:
 * - requestor: open → for_approval, cancelled
 * - requestor: for_approval (no approved/rejected) → open
 * - requestor: for_approval (has approved/rejected) → (none)
 * - requestor: approved → cancelled
 * - requestor: for_liquidation → liquidated
 * - approver: for_approval → approved, rejected
 * - accounting: approved → for_liquidation, closed, rejected
 * - accounting: liquidated → validated, for_liquidation
 * - accounting: validated → closed
 * - admin: union of all the above
 */
export function getPermittedTransitions(
  role: EffectiveRole,
  status: RequestStatusType,
  breakdownsSummary: BreakdownsSummary
): RequestStatusType[] {
  console.log('[getPermittedTransitions] role:', role, 'status:', status, 'breakdownsSummary:', breakdownsSummary);

  if (role === 'requestor') {
    return getRequestorTransitions(status, breakdownsSummary);
  }

  if (role === 'approver') {
    return getApproverTransitions(status);
  }

  if (role === 'accounting') {
    return getAccountingTransitions(status);
  }

  // admin: union of all above
  if (role === 'admin') {
    const requestorTransitions = getRequestorTransitions(status, breakdownsSummary);
    const approverTransitions = getApproverTransitions(status);
    const accountingTransitions = getAccountingTransitions(status);
    const merged = [...requestorTransitions];
    for (const t of approverTransitions) {
      if (!merged.includes(t)) merged.push(t);
    }
    for (const t of accountingTransitions) {
      if (!merged.includes(t)) merged.push(t);
    }
    return merged;
  }

  return [];
}

function getApproverTransitions(status: RequestStatusType): RequestStatusType[] {
  switch (status) {
    case 'for_approval':
      return ['approved', 'rejected'];
    default:
      return [];
  }
}

function getRequestorTransitions(
  status: RequestStatusType,
  breakdownsSummary: BreakdownsSummary
): RequestStatusType[] {
  switch (status) {
    case 'open':
      return ['for_approval', 'cancelled'];
    case 'for_approval':
      return breakdownsSummary.hasApprovedOrRejected ? [] : ['open', 'cancelled'];
    case 'approved':
      return ['cancelled'];
    case 'for_liquidation':
      return ['liquidated'];
    default:
      return [];
  }
}

function getAccountingTransitions(status: RequestStatusType): RequestStatusType[] {
  console.log('[getAccountingTransitions] status:', status);
  switch (status) {
    case 'for_approval':
      return ['cancelled'];
    case 'approved':
      return ['for_liquidation', 'closed', 'rejected'];
    case 'for_crediting':
      return [];
    case 'credited':
      return [];
    case 'liquidated':
      return ['validated', 'for_liquidation'];
    case 'validated':
      return ['closed'];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Liquidation metrics
// ---------------------------------------------------------------------------

export interface LiquidationEntry {
  amount: number | null;
  particulars?: string | null;
}

export interface LiquidationMetrics {
  count: number;
  requestedAmount: number;
  liquidatedTotal: number;
  excess: number;
  total: number;
}

/**
 * Computes aggregate metrics for a set of liquidation entries.
 *
 * - liquidatedTotal: sum of all liquidation amounts (including entries with particulars === "excess")
 * - excess: liquidatedTotal - requestedAmount  (may be negative)
 * - total: liquidatedTotal + excess  (= 2 * liquidatedTotal - requestedAmount)
 */
export function computeLiquidationMetrics(
  requestedAmount: number | null,
  liquidations: LiquidationEntry[]
): LiquidationMetrics {
  const normalizedRequestedAmount = requestedAmount ?? 0;

  const liquidatedTotal = liquidations.reduce((sum, entry) => {
    return sum + (entry.amount ?? 0);
  }, 0);

  const excess = liquidatedTotal - normalizedRequestedAmount;
  const total = liquidatedTotal + excess;

  return {
    count: liquidations.length,
    requestedAmount: normalizedRequestedAmount,
    liquidatedTotal,
    excess,
    total,
  };
}
