// "An English word you like (6+ letters) + your favorite 4-digit number,
// concatenated" — e.g. "sunshine4821". A UX convention to help students
// pick a memorable password; Convex Auth's own password hashing is what
// actually secures the account. Single source of truth for this rule —
// imported by convex/auth.ts (server-side signup enforcement),
// convex/adminActions.ts (admin-reset re-check), and re-exported from
// src/lib/passwordRule.ts for the client-side UX check.
export const PASSWORD_RULE_REGEX = /^[A-Za-z]{6,}[0-9]{4}$/;

export const PASSWORD_RULE_HINT =
  'Use a word you like (6+ letters) followed by your favorite 4-digit number — e.g. "sunshine4821".';

export function validatePassword(password: string): string | null {
  if (!PASSWORD_RULE_REGEX.test(password)) {
    return PASSWORD_RULE_HINT;
  }
  return null;
}
