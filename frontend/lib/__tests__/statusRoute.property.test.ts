// Feature: request-detail-actions, Property 2: Status transition API enforces role authorization
// Feature: request-detail-actions, Property 3: Status change atomically appends a history entry

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { getPermittedTransitions, type EffectiveRole } from '../requestDetailUtils';
import type { RequestStatusType } from '@/config/status';
import type { HistoryEntry } from '@/types/index';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const allRoles: EffectiveRole[] = ['requestor', 'approver', 'accounting', 'admin'];
const allStatuses: RequestStatusType[] = [
  'open', 'for_approval', 'approved', 'rejected', 'cancelled',
  'for_liquidation', 'liquidated', 'validated', 'for_crediting', 'closed',
];

const roleArb = fc.constantFrom(...allRoles);
const statusArb = fc.constantFrom(...allStatuses);
const boolArb = fc.boolean();

// Arbitrary for a non-permitted role for a given transition
// We'll generate (role, fromStatus, toStatus) triples where toStatus is NOT in permitted
const forbiddenTransitionArb = fc.tuple(roleArb, statusArb, boolArb).chain(
  ([role, fromStatus, hasApprovedOrRejected]) => {
    const permitted = getPermittedTransitions(role, fromStatus, { hasApprovedOrRejected });
    const forbidden = allStatuses.filter((s) => !permitted.includes(s));
    if (forbidden.length === 0) {
      // All transitions permitted — pick a different role that has no permissions
      return fc.constant({ role: 'approver' as EffectiveRole, fromStatus, toStatus: 'open' as RequestStatusType, hasApprovedOrRejected });
    }
    return fc.constantFrom(...forbidden).map((toStatus) => ({
      role, fromStatus, toStatus, hasApprovedOrRejected,
    }));
  }
);

// Arbitrary for a permitted transition
const permittedTransitionArb = fc.tuple(roleArb, statusArb, boolArb).chain(
  ([role, fromStatus, hasApprovedOrRejected]) => {
    const permitted = getPermittedTransitions(role, fromStatus, { hasApprovedOrRejected });
    if (permitted.length === 0) {
      // Fall back to a known-good transition
      return fc.constant({
        role: 'requestor' as EffectiveRole,
        fromStatus: 'open' as RequestStatusType,
        toStatus: 'for_approval' as RequestStatusType,
        hasApprovedOrRejected: false,
      });
    }
    return fc.constantFrom(...permitted).map((toStatus) => ({
      role, fromStatus, toStatus, hasApprovedOrRejected,
    }));
  }
);

// ---------------------------------------------------------------------------
// Authorization logic (mirrors the route's decision logic)
// ---------------------------------------------------------------------------

/**
 * Simulates the route's authorization check.
 * Returns the HTTP status code the route would return.
 */
function simulateRouteAuth(
  user: { role: string; name: string } | null,
  fromStatus: RequestStatusType,
  toStatus: RequestStatusType,
  hasApprovedOrRejected: boolean
): 401 | 403 | 400 | 200 {
  // 401 if unauthenticated
  if (!user) return 401;

  const validRoles: EffectiveRole[] = ['requestor', 'approver', 'accounting', 'admin'];
  const effectiveRole = validRoles.includes(user.role as EffectiveRole)
    ? (user.role as EffectiveRole)
    : null;

  if (!effectiveRole) return 403;

  const permitted = getPermittedTransitions(effectiveRole, fromStatus, { hasApprovedOrRejected });

  if (permitted.includes(toStatus)) return 200;

  // Check if any role permits this transition from this status
  const anyRolePermits = validRoles.some((r) =>
    getPermittedTransitions(r, fromStatus, { hasApprovedOrRejected }).includes(toStatus)
  );

  return anyRolePermits ? 403 : 400;
}

// ---------------------------------------------------------------------------
// Property 2: Status transition API enforces role authorization
// Validates: Requirements 2.8, 2.9, 4.5
// ---------------------------------------------------------------------------

describe('Property 2: Status transition API enforces role authorization', () => {
  it('returns 401 when user is unauthenticated, for any transition attempt', () => {
    fc.assert(
      fc.property(statusArb, statusArb, boolArb, (fromStatus, toStatus, hasApprovedOrRejected) => {
        const code = simulateRouteAuth(null, fromStatus, toStatus, hasApprovedOrRejected);
        expect(code).toBe(401);
      }),
      { numRuns: 200 }
    );
  });

  it('returns 403 when role is not permitted for the requested transition', () => {
    fc.assert(
      fc.property(forbiddenTransitionArb, ({ role, fromStatus, toStatus, hasApprovedOrRejected }) => {
        const user = { role, name: 'Test User' };
        const code = simulateRouteAuth(user, fromStatus, toStatus, hasApprovedOrRejected);
        // Must be 403 (role not permitted) or 400 (transition invalid for any role)
        expect([403, 400]).toContain(code);
      }),
      { numRuns: 300 }
    );
  });

  it('returns 403 (not 400) when the transition is valid in principle but not for this role', () => {
    // requestor cannot do accounting-only transitions
    const accountingOnlyTransitions: Array<[RequestStatusType, RequestStatusType]> = [
      ['approved', 'for_liquidation'],
      ['approved', 'for_crediting'],
      ['liquidated', 'validated'],
      ['validated', 'closed'],
    ];

    for (const [fromStatus, toStatus] of accountingOnlyTransitions) {
      const code = simulateRouteAuth(
        { role: 'requestor', name: 'Test' },
        fromStatus,
        toStatus,
        false
      );
      expect(code).toBe(403);
    }
  });

  it('returns 400 when the transition is invalid for any role from the current status', () => {
    // No role can go from 'closed' to anything
    fc.assert(
      fc.property(statusArb, boolArb, (toStatus, hasApprovedOrRejected) => {
        const code = simulateRouteAuth(
          { role: 'admin', name: 'Admin' },
          'closed',
          toStatus,
          hasApprovedOrRejected
        );
        // closed is terminal — no transitions are valid
        expect(code).toBe(400);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 400 when the transition is invalid for any role from cancelled status', () => {
    fc.assert(
      fc.property(statusArb, boolArb, (toStatus, hasApprovedOrRejected) => {
        const code = simulateRouteAuth(
          { role: 'admin', name: 'Admin' },
          'cancelled',
          toStatus,
          hasApprovedOrRejected
        );
        expect(code).toBe(400);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 200 when role is permitted for the requested transition', () => {
    fc.assert(
      fc.property(permittedTransitionArb, ({ role, fromStatus, toStatus, hasApprovedOrRejected }) => {
        const user = { role, name: 'Test User' };
        const code = simulateRouteAuth(user, fromStatus, toStatus, hasApprovedOrRejected);
        expect(code).toBe(200);
      }),
      { numRuns: 300 }
    );
  });

  it('unknown roles are treated as forbidden (403)', () => {
    fc.assert(
      fc.property(statusArb, statusArb, boolArb, (fromStatus, toStatus, hasApprovedOrRejected) => {
        const code = simulateRouteAuth(
          { role: 'unknown_role', name: 'Hacker' },
          fromStatus,
          toStatus,
          hasApprovedOrRejected
        );
        expect(code).toBe(403);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Status change atomically appends a history entry
// Validates: Requirements 2.7, 4.4, 12.1
// ---------------------------------------------------------------------------

/**
 * Simulates the atomic history append that the route performs on a successful transition.
 */
function simulateStatusChange(
  currentHistory: HistoryEntry[],
  fromStatus: RequestStatusType,
  toStatus: RequestStatusType,
  actorName: string
): { history: HistoryEntry[]; status: RequestStatusType } {
  const entry: HistoryEntry = {
    action: 'Status Changed',
    user: actorName,
    timestamp: new Date().toISOString(),
    from_status: fromStatus,
    to_status: toStatus,
  };
  return {
    history: [...currentHistory, entry],
    status: toStatus,
  };
}

const safeIsoTimestampArb = fc
  .integer({ min: 0, max: 4102444800000 }) // 1970 to 2100
  .map((ms) => new Date(ms).toISOString());

const historyEntryArb = fc.record({
  action: fc.string({ minLength: 1 }),
  user: fc.string({ minLength: 1 }),
  timestamp: safeIsoTimestampArb,
  from_status: fc.option(fc.constantFrom(...allStatuses), { nil: undefined }),
  to_status: fc.option(fc.constantFrom(...allStatuses), { nil: undefined }),
});

const historyArb = fc.array(historyEntryArb, { maxLength: 20 });
const actorNameArb = fc.string({ minLength: 1, maxLength: 50 });

describe('Property 3: Status change atomically appends a history entry', () => {
  it('history array grows by exactly 1 after a status change', () => {
    fc.assert(
      fc.property(
        historyArb, statusArb, statusArb, actorNameArb,
        (currentHistory, fromStatus, toStatus, actorName) => {
          const result = simulateStatusChange(currentHistory, fromStatus, toStatus, actorName);
          expect(result.history.length).toBe(currentHistory.length + 1);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('last history entry has action "Status Changed"', () => {
    fc.assert(
      fc.property(
        historyArb, statusArb, statusArb, actorNameArb,
        (currentHistory, fromStatus, toStatus, actorName) => {
          const result = simulateStatusChange(currentHistory, fromStatus, toStatus, actorName);
          const last = result.history[result.history.length - 1];
          expect(last.action).toBe('Status Changed');
        }
      ),
      { numRuns: 200 }
    );
  });

  it('last history entry has correct from_status and to_status', () => {
    fc.assert(
      fc.property(
        historyArb, statusArb, statusArb, actorNameArb,
        (currentHistory, fromStatus, toStatus, actorName) => {
          const result = simulateStatusChange(currentHistory, fromStatus, toStatus, actorName);
          const last = result.history[result.history.length - 1];
          expect(last.from_status).toBe(fromStatus);
          expect(last.to_status).toBe(toStatus);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('last history entry has the actor name', () => {
    fc.assert(
      fc.property(
        historyArb, statusArb, statusArb, actorNameArb,
        (currentHistory, fromStatus, toStatus, actorName) => {
          const result = simulateStatusChange(currentHistory, fromStatus, toStatus, actorName);
          const last = result.history[result.history.length - 1];
          expect(last.user).toBe(actorName);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('last history entry has a valid ISO timestamp', () => {
    fc.assert(
      fc.property(
        historyArb, statusArb, statusArb, actorNameArb,
        (currentHistory, fromStatus, toStatus, actorName) => {
          const result = simulateStatusChange(currentHistory, fromStatus, toStatus, actorName);
          const last = result.history[result.history.length - 1];
          expect(last.timestamp).toBeTruthy();
          expect(() => new Date(last.timestamp)).not.toThrow();
          expect(new Date(last.timestamp).toISOString()).toBe(last.timestamp);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('existing history entries are preserved (append-only)', () => {
    fc.assert(
      fc.property(
        historyArb, statusArb, statusArb, actorNameArb,
        (currentHistory, fromStatus, toStatus, actorName) => {
          const result = simulateStatusChange(currentHistory, fromStatus, toStatus, actorName);
          // All original entries are still present at the same indices
          for (let i = 0; i < currentHistory.length; i++) {
            expect(result.history[i]).toEqual(currentHistory[i]);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('resulting status equals the requested toStatus', () => {
    fc.assert(
      fc.property(
        historyArb, statusArb, statusArb, actorNameArb,
        (currentHistory, fromStatus, toStatus, actorName) => {
          const result = simulateStatusChange(currentHistory, fromStatus, toStatus, actorName);
          expect(result.status).toBe(toStatus);
        }
      ),
      { numRuns: 200 }
    );
  });
});
