// Feature: request-detail-actions, Property 10: Document upload requires non-empty name

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure validation helper (mirrors the route logic without Supabase)
// ---------------------------------------------------------------------------

/**
 * Simulates the name validation performed in POST /api/requests/[id]/documents.
 * Returns 400 if name is empty/whitespace-only, 200 otherwise.
 */
function validateDocumentName(name: string | null | undefined): 400 | 200 {
  if (!name || !name.trim()) return 400;
  return 200;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates strings composed entirely of whitespace characters. */
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { minLength: 0, maxLength: 30 })
  .map((chars) => chars.join(''));

/** Generates strings that contain at least one non-whitespace character. */
const nonWhitespaceArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.string({ minLength: 0, maxLength: 10 })
  )
  .map(([core, suffix]) => core.trim() + suffix)
  .filter((s) => s.trim().length > 0);

// ---------------------------------------------------------------------------
// Property 10: Document upload requires non-empty name
// Validates: Requirements 10.8
// ---------------------------------------------------------------------------

describe('Property 10: Document upload requires non-empty name', () => {
  it('returns 400 for whitespace-only document names', () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (name) => {
        const result = validateDocumentName(name);
        expect(result).toBe(400);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 400 for null or undefined document name', () => {
    expect(validateDocumentName(null)).toBe(400);
    expect(validateDocumentName(undefined)).toBe(400);
  });

  it('returns 200 for names with at least one non-whitespace character', () => {
    fc.assert(
      fc.property(nonWhitespaceArb, (name) => {
        const result = validateDocumentName(name);
        expect(result).toBe(200);
      }),
      { numRuns: 100 }
    );
  });

  it('returns 400 for the empty string', () => {
    expect(validateDocumentName('')).toBe(400);
  });
});
