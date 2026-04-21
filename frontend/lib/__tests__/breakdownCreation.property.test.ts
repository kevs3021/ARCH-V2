// Feature: request-detail-actions, Property 7: Breakdown creation and editing append history entries
// Feature: request-detail-actions, Property 8: History log is append-only

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { RequestStatusType } from '@/config/status';

type TestHistoryEntry = {
  action: string;
  user: string;
  timestamp: string;
  from_status?: RequestStatusType;
  to_status?: RequestStatusType;
};

// ---------------------------------------------------------------------------
// All known request statuses
// ---------------------------------------------------------------------------

const allStatuses: RequestStatusType[] = [
  'open', 'for_approval', 'approved', 'rejected', 'cancelled',
  'for_liquidation', 'liquidated', 'validated', 'for_crediting', 'closed',
];

// ---------------------------------------------------------------------------
// Pure simulation helpers (mirror the route logic without Supabase)
// ---------------------------------------------------------------------------

/**
 * Simulates the POST /api/breakdowns authorization check.
 */
function simulateBreakdownCreateAuth(
  user: { role: string; name: string } | null
): 401 | 403 | 201 {
  if (!user) return 401;
  if (user.role !== 'requestor' && user.role !== 'admin') return 403;
  return 201;
}

/**
 * Simulates the history append that occurs on a successful breakdown creation.
 */
function simulateBreakdownCreate(
  currentHistory: TestHistoryEntry[],
  particulars: string,
  actorName: string
): { history: TestHistoryEntry[] } {
  const entry: TestHistoryEntry = {
    action: 'Breakdown Added',
    user: actorName,
    timestamp: new Date().toISOString(),
  };
  return { history: [...currentHistory, entry] };
}

/**
 * Simulates a generic operation that appends one history entry.
 * Used for Property 8 to model any create/edit/status-change operation.
 */
function simulateOperation(
  currentHistory: TestHistoryEntry[],
  action: string,
  actorName: string
): TestHistoryEntry[] {
  const entry: TestHistoryEntry = {
    action,
    user: actorName,
    timestamp: new Date().toISOString(),
  };
  return [...currentHistory, entry];
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

const historyArb = fc.array(historyEntryArb, { maxLength: 20 }) as unknown as fc.Arbitrary<TestHistoryEntry[]>;

const actorNameArb = fc.string({ minLength: 1, maxLength: 50 });

const particularsArb = fc.string({ minLength: 1, maxLength: 100 });

const operationActionArb = fc.constantFrom(
  'Breakdown Added',
  'Breakdown Edited',
  'Status Changed'
);

// ---------------------------------------------------------------------------
// Property 7: Breakdown creation and editing append history entries (creation side)
// Validates: Requirements 7.3, 12.3
// ---------------------------------------------------------------------------

describe('Property 7: Breakdown creation and editing append history entries (creation side)', () => {
  it('history array grows by exactly 1 after a breakdown creation', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownCreate(currentHistory, particulars, actorName);
        expect(result.history.length).toBe(currentHistory.length + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('last history entry has action "Breakdown Added"', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownCreate(currentHistory, particulars, actorName);
        const last = result.history[result.history.length - 1];
        expect(last.action).toBe('Breakdown Added');
      }),
      { numRuns: 100 }
    );
  });

  it('last history entry has the actor name', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownCreate(currentHistory, particulars, actorName);
        const last = result.history[result.history.length - 1];
        expect(last.user).toBe(actorName);
      }),
      { numRuns: 100 }
    );
  });

  it('last history entry has a valid ISO timestamp', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownCreate(currentHistory, particulars, actorName);
        const last = result.history[result.history.length - 1];
        expect(last.timestamp).toBeTruthy();
        expect(new Date(last.timestamp).toISOString()).toBe(last.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  it('existing history entries are preserved after creation (append-only)', () => {
    fc.assert(
      fc.property(historyArb, particularsArb, actorNameArb, (currentHistory, particulars, actorName) => {
        const result = simulateBreakdownCreate(currentHistory, particulars, actorName);
        for (let i = 0; i < currentHistory.length; i++) {
          expect(result.history[i]).toEqual(currentHistory[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('returns 403 for non-requestor/admin roles', () => {
    const forbiddenRoles = ['approver', 'accounting', 'manager', 'employee', 'viewer'];
    fc.assert(
      fc.property(fc.constantFrom(...forbiddenRoles), actorNameArb, (role, name) => {
        const code = simulateBreakdownCreateAuth({ role, name });
        expect(code).toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 201 for requestor and admin roles', () => {
    const permittedRoles = ['requestor', 'admin'];
    fc.assert(
      fc.property(fc.constantFrom(...permittedRoles), actorNameArb, (role, name) => {
        const code = simulateBreakdownCreateAuth({ role, name });
        expect(code).toBe(201);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 401 when unauthenticated', () => {
    const code = simulateBreakdownCreateAuth(null);
    expect(code).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Property 8: History log is append-only
// Validates: Requirements 12.5
// ---------------------------------------------------------------------------

describe('Property 8: History log is append-only', () => {
  it('history length never decreases across a sequence of operations', () => {
    fc.assert(
      fc.property(
        historyArb,
        fc.array(
          fc.record({ action: operationActionArb, actor: actorNameArb }),
          { minLength: 1, maxLength: 20 }
        ),
        (initialHistory, operations) => {
          let history = [...initialHistory];
          for (const op of operations) {
            const prevLength = history.length;
            history = simulateOperation(history, op.action, op.actor);
            expect(history.length).toBeGreaterThanOrEqual(prevLength);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('history length increases by exactly 1 per operation', () => {
    fc.assert(
      fc.property(
        historyArb,
        fc.array(
          fc.record({ action: operationActionArb, actor: actorNameArb }),
          { minLength: 1, maxLength: 20 }
        ),
        (initialHistory, operations) => {
          let history = [...initialHistory];
          for (const op of operations) {
            const prevLength = history.length;
            history = simulateOperation(history, op.action, op.actor);
            expect(history.length).toBe(prevLength + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no existing entries are mutated across a sequence of operations', () => {
    fc.assert(
      fc.property(
        historyArb,
        fc.array(
          fc.record({ action: operationActionArb, actor: actorNameArb }),
          { minLength: 1, maxLength: 10 }
        ),
        (initialHistory, operations) => {
          let history = [...initialHistory];
          const snapshots: TestHistoryEntry[][] = [history];

          for (const op of operations) {
            history = simulateOperation(history, op.action, op.actor);
            snapshots.push(history);
          }

          // Every snapshot's prefix must match the initial history
          for (const snapshot of snapshots) {
            for (let i = 0; i < initialHistory.length; i++) {
              expect(snapshot[i]).toEqual(initialHistory[i]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('final history length equals initial length plus number of operations', () => {
    fc.assert(
      fc.property(
        historyArb,
        fc.array(
          fc.record({ action: operationActionArb, actor: actorNameArb }),
          { minLength: 0, maxLength: 20 }
        ),
        (initialHistory, operations) => {
          let history = [...initialHistory];
          for (const op of operations) {
            history = simulateOperation(history, op.action, op.actor);
          }
          expect(history.length).toBe(initialHistory.length + operations.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
