// Feature: request-detail-actions, Property 1: Status transitions are role-gated
// Feature: request-detail-actions, Property 9: Liquidations metrics are computed correctly

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getPermittedTransitions,
  computeLiquidationMetrics,
  type EffectiveRole,
} from '../requestDetailUtils';
import type { RequestStatusType } from '@/config/status';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const allRoles: EffectiveRole[] = ['requestor', 'approver', 'accounting', 'admin'];

const allStatuses: RequestStatusType[] = [
  'open',
  'for_approval',
  'approved',
  'rejected',
  'cancelled',
  'for_liquidation',
  'liquidated',
  'validated',
  'for_crediting',
  'closed',
];

const roleArb = fc.constantFrom(...allRoles);
const statusArb = fc.constantFrom(...allStatuses);
const boolArb = fc.boolean();

// ---------------------------------------------------------------------------
// Expected transition matrix (mirrors getPermittedTransitions logic)
// ---------------------------------------------------------------------------

function expectedTransitions(
  role: EffectiveRole,
  status: RequestStatusType,
  hasApprovedOrRejected: boolean
): RequestStatusType[] {
  const requestorFor = (s: RequestStatusType): RequestStatusType[] => {
    switch (s) {
      case 'open': return ['for_approval', 'cancelled'];
      case 'for_approval': return hasApprovedOrRejected ? [] : ['open'];
      case 'approved': return ['cancelled'];
      case 'for_liquidation': return ['liquidated'];
      default: return [];
    }
  };

  const accountingFor = (s: RequestStatusType): RequestStatusType[] => {
    switch (s) {
      case 'approved': return ['for_liquidation', 'for_crediting'];
      case 'liquidated': return ['validated'];
      case 'validated': return ['closed'];
      default: return [];
    }
  };

  if (role === 'approver') return [];
  if (role === 'requestor') return requestorFor(status);
  if (role === 'accounting') return accountingFor(status);

  // admin: deduped union of requestor + accounting
  const r = requestorFor(status);
  const a = accountingFor(status);
  const merged = [...r];
  for (const t of a) {
    if (!merged.includes(t)) merged.push(t);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Property 1: Status transitions are role-gated
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 14.2, 14.3
// ---------------------------------------------------------------------------

describe('Property 1: getPermittedTransitions — status transitions are role-gated', () => {
  it('matches the expected matrix for all (role, status, hasApprovedOrRejected) combinations', () => {
    fc.assert(
      fc.property(roleArb, statusArb, boolArb, (role, status, hasApprovedOrRejected) => {
        const actual = getPermittedTransitions(role, status, { hasApprovedOrRejected });
        const expected = expectedTransitions(role, status, hasApprovedOrRejected);
        expect(actual).toEqual(expected);
      }),
      { numRuns: 200 }
    );
  });

  it('approver always gets empty transitions regardless of status', () => {
    fc.assert(
      fc.property(statusArb, boolArb, (status, hasApprovedOrRejected) => {
        const result = getPermittedTransitions('approver', status, { hasApprovedOrRejected });
        expect(result).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it('requestor + for_approval: transitions depend on hasApprovedOrRejected', () => {
    fc.assert(
      fc.property(boolArb, (hasApprovedOrRejected) => {
        const result = getPermittedTransitions('requestor', 'for_approval', { hasApprovedOrRejected });
        if (hasApprovedOrRejected) {
          expect(result).toEqual([]);
        } else {
          expect(result).toEqual(['open']);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('admin transitions are a superset of both requestor and accounting transitions', () => {
    fc.assert(
      fc.property(statusArb, boolArb, (status, hasApprovedOrRejected) => {
        const summary = { hasApprovedOrRejected };
        const adminResult = getPermittedTransitions('admin', status, summary);
        const requestorResult = getPermittedTransitions('requestor', status, summary);
        const accountingResult = getPermittedTransitions('accounting', status, summary);

        for (const t of requestorResult) {
          expect(adminResult).toContain(t);
        }
        for (const t of accountingResult) {
          expect(adminResult).toContain(t);
        }
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Liquidations metrics are computed correctly
// Validates: Requirements 8.5, 8.6, 8.7
// ---------------------------------------------------------------------------

const liquidationEntryArb = fc.record({
  amount: fc.oneof(
    fc.float({ min: 0, max: 10000, noNaN: true }),
    fc.constant(null)
  ),
});

const liquidationsArb = fc.array(liquidationEntryArb);

const requestedAmountArb = fc.oneof(
  fc.float({ min: 0, max: 100000, noNaN: true }),
  fc.constant(null)
);

describe('Property 9: computeLiquidationMetrics — metrics are computed correctly', () => {
  it('excess = liquidatedTotal - requestedAmount always holds', () => {
    fc.assert(
      fc.property(requestedAmountArb, liquidationsArb, (requestedAmount, liquidations) => {
        const metrics = computeLiquidationMetrics(requestedAmount, liquidations);
        expect(metrics.excess).toBeCloseTo(metrics.liquidatedTotal - metrics.requestedAmount, 5);
      }),
      { numRuns: 200 }
    );
  });

  it('total = liquidatedTotal + excess always holds', () => {
    fc.assert(
      fc.property(requestedAmountArb, liquidationsArb, (requestedAmount, liquidations) => {
        const metrics = computeLiquidationMetrics(requestedAmount, liquidations);
        expect(metrics.total).toBeCloseTo(metrics.liquidatedTotal + metrics.excess, 5);
      }),
      { numRuns: 200 }
    );
  });

  it('count equals the length of the input array', () => {
    fc.assert(
      fc.property(requestedAmountArb, liquidationsArb, (requestedAmount, liquidations) => {
        const metrics = computeLiquidationMetrics(requestedAmount, liquidations);
        expect(metrics.count).toBe(liquidations.length);
      }),
      { numRuns: 200 }
    );
  });

  it('when requestedAmount is null, it defaults to 0', () => {
    fc.assert(
      fc.property(liquidationsArb, (liquidations) => {
        const metrics = computeLiquidationMetrics(null, liquidations);
        expect(metrics.requestedAmount).toBe(0);
        expect(metrics.excess).toBeCloseTo(metrics.liquidatedTotal - 0, 5);
      }),
      { numRuns: 200 }
    );
  });
});
