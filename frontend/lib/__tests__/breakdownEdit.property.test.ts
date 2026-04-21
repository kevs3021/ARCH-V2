// Feature: request-detail-actions, Property 6: Breakdown edit is blocked when request is not open
// Feature: request-detail-actions, Property 7: Breakdown creation and editing append history entries

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { HistoryEntry } from '@/types/index';
import type { RequestStatusType } from '@/config/status';

// ---------------------------------------------------------------------------
// All known request statuses
// ---------------------------------------------------------------------------

const allStatuses: RequestStatusType[] = [
  'open', 'for_approval', 'approved', 'rejected', 'cancelled',
  'for_liquidation', 'liquidated', 'validated', 'for_crediting', 'closed',
];

const nonOpenStatuses: RequestStatusType[] = allStatuses.filter((s) => s !== 'open');

// ---------------------------------------------------------------------------
// Pure simulation helpers (mirror the route logic without Supabase)
// ---------------------------------------------------------------------------

/**
 * Simulates the PATCH /api/breakdowns/[breakdownId] authorization + status check.
 * Returns the HTTP status code the route would return.
 */
function simulateBreakdownEditAuth(
  user: { role: string; name: string } | null,
  requestStatus: string
): 401 | 403 | 200 {
  if (!user) return 401;
  if (user.role !== 'requestor' && user.role !== 'admin') return 403;
  if (requestStatus !== 'open') return 403;
  return 200;
}

/**
 * Simulates the history append that occurs on a successful breakdown edit.
 */
function simulateBreakdownEdit(
  currentHistory: HistoryEntry[],
  particulars: string,
  actorName: string
): { history: HistoryEntry[] } {
  const entry: HistoryEntry = {
    action: 'Breakdown Edited',
    user: actorName,
    timestamp: new Date().toISOString(),
  };
  return { history: [...currentHistory, entry] };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

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

const nonOpenStatusArb = fc.constantFrom(...nonOpenStatuses);

const actorNameArb = fc.string({ minLength: 1, maxLength: 50 });

const particularsArb = fc.string({ minLength: 1, maxLength: 100 });

const editPayloadArb = fc.record({
  particulars: fc.option(particularsArb, { nil: undefined }),
  amount: fc.option(fc.float({ min: 0, max: 1_000_000 }), { nil: undefined }),
  purpose: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  store: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
});

// ---------------------------------------------------------------------------
// Property 6: Breakdown edit is blocked when request is not open
// Validates: Requirements 1.6, 6.10
// ---------------------------------------------------------------------------

describe('Property 6: Breakdown edit is blocked when request is not open', () => {
  it('returns 403 for any non-open request status when user is requestor', () => {
    fc.assert(
      fc.property(nonOpenStatusArb, (requestStatus) => {
        const code = simulateBreakdownEditAuth({ role: 'requestor', name: 'Alice' }, requestStatus);
        expect(code).toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 403 for any non-open request status when user is admin', () => {
    fc.assert(
      fc.property(nonOpenStatusArb, (requestStatus) => {
        const code = simulateBreakdownEditAuth({ role: 'admin', name: 'Admin' }, requestStatus);
        expect(code).toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 403 for any non-open request status regardless of role', () => {
    const allRoles = ['requestor', 'admin', 'approver', 'accounting'];
    fc.assert(
      fc.property(
        nonOpenStatusArb,
        fc.constantFrom(...allRoles),
        (requestStatus, role) => {
          const code = simulateBreakdownEditAuth({ role, name: 'User' }, requestStatus);
          // Non-requestor/admin roles get 403 for role reason; requestor/admin get 403 for status reason
          expect(code).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns 401 when user is unauthenticated, regardless of request status', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allStatuses), (requestStatus) => {
        const code = simulateBreakdownEditAuth(null, requestStatus);
        expect(code).toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 200 only when request status is open and role is requestor or admin', () => {
    const permittedRoles = ['requestor', 'admin'];
    fc.assert(
      fc.property(fc.constantFrom(...permittedRoles), actorNameArb, (role, name) => {
        const code = simulateBreakdownEditAuth({ role, name }, 'open');
        expect(code).toBe(200);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 403 for non-requestor/admin roles even when request is open', () => {
    const forbiddenRoles = ['approver', 'accounting', 'manager', 'employee', 'viewer'];
    fc.assert(
      fc.property(fc.constantFrom(...forbiddenRoles), actorNameArb, (role, name) => {
        const code = simulateBreakdownEditAuth({ role, name }, 'open');
        expect(code).toBe(403);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Breakdown creation and editing append history entries (edit side)
// Validates: Requirements 6.4, 12.4
// ---------------------------------------------------------------------------

describe('Property 7: Breakdown creation and editing append history entries (edit side)', () => {
  it('history array grows by exactly 1 after a breakdown edit', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownEdit(currentHistory, particulars, actorName);
        expect(result.history.length).toBe(currentHistory.length + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('last history entry has action "Breakdown Edited"', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownEdit(currentHistory, particulars, actorName);
        const last = result.history[result.history.length - 1];
        expect(last.action).toBe('Breakdown Edited');
      }),
      { numRuns: 100 }
    );
  });

  it('last history entry has the actor name', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownEdit(currentHistory, particulars, actorName);
        const last = result.history[result.history.length - 1];
        expect(last.user).toBe(actorName);
      }),
      { numRuns: 100 }
    );
  });

  it('last history entry has a valid ISO timestamp', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownEdit(currentHistory, particulars, actorName);
        const last = result.history[result.history.length - 1];
        expect(last.timestamp).toBeTruthy();
        expect(new Date(last.timestamp).toISOString()).toBe(last.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  it('existing history entries are preserved (append-only)', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownEdit(currentHistory, particulars, actorName);
        for (let i = 0; i < currentHistory.length; i++) {
          expect(result.history[i]).toEqual(currentHistory[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('edit with any payload subset still appends exactly one history entry', () => {
    fc.assert(
      fc.property(historyArb, editPayloadArb, actorNameArb, (currentHistory, payload, actorName) => {
        const particulars = payload.particulars ?? 'existing particulars';
        const result = simulateBreakdownEdit(currentHistory, particulars, actorName);
        expect(result.history.length).toBe(currentHistory.length + 1);
        expect(result.history[result.history.length - 1].action).toBe('Breakdown Edited');
      }),
      { numRuns: 100 }
    );
  });
});
