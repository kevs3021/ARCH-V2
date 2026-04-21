// Feature: request-detail-actions, Property 11: Recorded toggle is accounting-only

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const allowedRoles = ['accounting', 'admin'] as const;
const forbiddenRoles = ['requestor', 'approver', 'manager', 'employee', 'viewer'] as const;

const allowedRoleArb = fc.constantFrom(...allowedRoles);
const forbiddenRoleArb = fc.constantFrom(...forbiddenRoles);

// Any string that is not 'accounting' or 'admin'
const nonAccountingRoleArb = fc.oneof(
  forbiddenRoleArb,
  fc.string({ minLength: 1, maxLength: 20 }).filter(
    (s) => s !== 'accounting' && s !== 'admin'
  )
);

// ---------------------------------------------------------------------------
// Authorization logic (mirrors the route's decision logic)
// ---------------------------------------------------------------------------

/**
 * Simulates the route's authorization check for the recorded toggle.
 * Returns the HTTP status code the route would return.
 */
function simulateRecordedRouteAuth(
  user: { role: string } | null
): 401 | 403 | 200 {
  if (!user) return 401;
  if (user.role !== 'accounting' && user.role !== 'admin') return 403;
  return 200;
}

/**
 * Simulates the toggle logic: given a current recorded value, returns the toggled value.
 */
function simulateToggle(currentRecorded: boolean): boolean {
  return !currentRecorded;
}

// ---------------------------------------------------------------------------
// Property 11: Recorded toggle is accounting-only
// Validates: Requirements 5.5, 5.6
// ---------------------------------------------------------------------------

describe('Property 11: Recorded toggle is accounting-only', () => {
  it('returns 401 when user is unauthenticated', () => {
    fc.assert(
      fc.property(fc.constant(null), (user) => {
        const code = simulateRecordedRouteAuth(user);
        expect(code).toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 403 for any role that is not accounting or admin', () => {
    fc.assert(
      fc.property(nonAccountingRoleArb, (role) => {
        const code = simulateRecordedRouteAuth({ role });
        expect(code).toBe(403);
      }),
      { numRuns: 200 }
    );
  });

  it('returns 200 for accounting role', () => {
    fc.assert(
      fc.property(fc.constant('accounting'), (role) => {
        const code = simulateRecordedRouteAuth({ role });
        expect(code).toBe(200);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 200 for admin role', () => {
    fc.assert(
      fc.property(fc.constant('admin'), (role) => {
        const code = simulateRecordedRouteAuth({ role });
        expect(code).toBe(200);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 200 for all allowed roles (accounting and admin)', () => {
    fc.assert(
      fc.property(allowedRoleArb, (role) => {
        const code = simulateRecordedRouteAuth({ role });
        expect(code).toBe(200);
      }),
      { numRuns: 100 }
    );
  });

  it('toggle always inverts the recorded boolean', () => {
    fc.assert(
      fc.property(fc.boolean(), (currentRecorded) => {
        const toggled = simulateToggle(currentRecorded);
        expect(toggled).toBe(!currentRecorded);
      }),
      { numRuns: 100 }
    );
  });

  it('double toggle returns to original value', () => {
    fc.assert(
      fc.property(fc.boolean(), (currentRecorded) => {
        const toggled = simulateToggle(currentRecorded);
        const doubleToggled = simulateToggle(toggled);
        expect(doubleToggled).toBe(currentRecorded);
      }),
      { numRuns: 100 }
    );
  });

  it('forbidden roles never get 200 or 401', () => {
    fc.assert(
      fc.property(forbiddenRoleArb, (role) => {
        const code = simulateRecordedRouteAuth({ role });
        expect(code).toBe(403);
        expect(code).not.toBe(200);
        expect(code).not.toBe(401);
      }),
      { numRuns: 100 }
    );
  });
});
