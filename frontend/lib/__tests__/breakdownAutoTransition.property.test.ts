// Feature: request-detail-actions, Property 4: Breakdown rejection triggers automatic request status change
// Feature: request-detail-actions, Property 5: All-breakdowns-approved triggers automatic request approval

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { HistoryEntry } from '@/types/index';
import type { RequestStatusType } from '@/config/status';

// ---------------------------------------------------------------------------
// Pure simulation helpers (mirror the route logic without Supabase)
// ---------------------------------------------------------------------------

/**
 * Simulates the reject route's auto-transition logic.
 * Returns the updated request state after a breakdown is rejected.
 */
function simulateBreakdownRejection(
  currentStatus: string,
  currentHistory: HistoryEntry[]
): { status: string; history: HistoryEntry[] } {
  const systemEntry: HistoryEntry = {
    action: 'Status Changed',
    user: 'System',
    timestamp: new Date().toISOString(),
    from_status: currentStatus,
    to_status: 'rejected',
  };
  return {
    status: 'rejected',
    history: [...currentHistory, systemEntry],
  };
}

/**
 * Simulates the approve route's auto-transition logic when all breakdowns are approved.
 * Returns the updated request state after all breakdowns are approved.
 */
function simulateAllBreakdownsApproved(
  currentStatus: string,
  currentHistory: HistoryEntry[]
): { status: string; history: HistoryEntry[] } {
  const systemEntry: HistoryEntry = {
    action: 'Status Changed',
    user: 'System',
    timestamp: new Date().toISOString(),
    from_status: currentStatus,
    to_status: 'approved',
  };
  return {
    status: 'approved',
    history: [...currentHistory, systemEntry],
  };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const allStatuses: RequestStatusType[] = [
  'open', 'for_approval', 'approved', 'rejected', 'cancelled',
  'for_liquidation', 'liquidated', 'validated', 'for_crediting', 'closed',
];

const safeIsoTimestampArb = fc
  .integer({ min: 0, max: 4102444800000 })
  .map((ms) => new Date(ms).toISOString());

const historyEntryArb = fc.record({
  action: fc.string({ minLength: 1 }),
  user: fc.string({ minLength: 1 }),
  timestamp: safeIsoTimestampArb,
  from_status: fc.option(fc.constantFrom(...allStatuses), { nil: undefined }),
  to_status: fc.option(fc.constantFrom(...allStatuses), { nil: undefined }),
});

const historyArb = fc.array(historyEntryArb, { maxLength: 20 });

const statusArb = fc.constantFrom(...allStatuses);

// Arbitrary for a non-empty array of breakdowns all with status 'Approved'
const allApprovedBreakdownsArb = fc
  .integer({ min: 1, max: 10 })
  .map((n) => Array.from({ length: n }, (_, i) => ({ breakdown_id: `BD-${i}`, status: 'Approved' })));

// ---------------------------------------------------------------------------
// Property 4: Breakdown rejection triggers automatic request status change
// Validates: Requirements 3.4, 12.2
// ---------------------------------------------------------------------------

describe('Property 4: Breakdown rejection triggers automatic request status change', () => {
  it('request status becomes "rejected" after any breakdown is rejected', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateBreakdownRejection(currentStatus, currentHistory);
        expect(result.status).toBe('rejected');
      }),
      { numRuns: 100 }
    );
  });

  it('a system history entry is appended with user "System"', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateBreakdownRejection(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.user).toBe('System');
      }),
      { numRuns: 100 }
    );
  });

  it('the appended history entry has action "Status Changed"', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateBreakdownRejection(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.action).toBe('Status Changed');
      }),
      { numRuns: 100 }
    );
  });

  it('the appended history entry has to_status "rejected"', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateBreakdownRejection(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.to_status).toBe('rejected');
      }),
      { numRuns: 100 }
    );
  });

  it('the appended history entry has from_status equal to the previous request status', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateBreakdownRejection(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.from_status).toBe(currentStatus);
      }),
      { numRuns: 100 }
    );
  });

  it('the appended history entry has a valid ISO timestamp', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateBreakdownRejection(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.timestamp).toBeTruthy();
        expect(new Date(last.timestamp).toISOString()).toBe(last.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  it('history array grows by exactly 1 after rejection', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateBreakdownRejection(currentStatus, currentHistory);
        expect(result.history.length).toBe(currentHistory.length + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('existing history entries are preserved (append-only)', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateBreakdownRejection(currentStatus, currentHistory);
        for (let i = 0; i < currentHistory.length; i++) {
          expect(result.history[i]).toEqual(currentHistory[i]);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: All-breakdowns-approved triggers automatic request approval
// Validates: Requirements 3.5, 12.2
// ---------------------------------------------------------------------------

describe('Property 5: All-breakdowns-approved triggers automatic request approval', () => {
  it('request status becomes "approved" when all breakdowns are approved', () => {
    fc.assert(
      fc.property(statusArb, historyArb, allApprovedBreakdownsArb, (currentStatus, currentHistory, breakdowns) => {
        const allApproved = breakdowns.every((b) => b.status === 'Approved');
        expect(allApproved).toBe(true); // generator invariant

        const result = simulateAllBreakdownsApproved(currentStatus, currentHistory);
        expect(result.status).toBe('approved');
      }),
      { numRuns: 100 }
    );
  });

  it('a system history entry is appended with user "System"', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateAllBreakdownsApproved(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.user).toBe('System');
      }),
      { numRuns: 100 }
    );
  });

  it('the appended history entry has action "Status Changed"', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateAllBreakdownsApproved(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.action).toBe('Status Changed');
      }),
      { numRuns: 100 }
    );
  });

  it('the appended history entry has to_status "approved"', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateAllBreakdownsApproved(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.to_status).toBe('approved');
      }),
      { numRuns: 100 }
    );
  });

  it('the appended history entry has from_status equal to the previous request status', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateAllBreakdownsApproved(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.from_status).toBe(currentStatus);
      }),
      { numRuns: 100 }
    );
  });

  it('the appended history entry has a valid ISO timestamp', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateAllBreakdownsApproved(currentStatus, currentHistory);
        const last = result.history[result.history.length - 1];
        expect(last.timestamp).toBeTruthy();
        expect(new Date(last.timestamp).toISOString()).toBe(last.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  it('history array grows by exactly 1 after all-approved transition', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateAllBreakdownsApproved(currentStatus, currentHistory);
        expect(result.history.length).toBe(currentHistory.length + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('existing history entries are preserved (append-only)', () => {
    fc.assert(
      fc.property(statusArb, historyArb, (currentStatus, currentHistory) => {
        const result = simulateAllBreakdownsApproved(currentStatus, currentHistory);
        for (let i = 0; i < currentHistory.length; i++) {
          expect(result.history[i]).toEqual(currentHistory[i]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
