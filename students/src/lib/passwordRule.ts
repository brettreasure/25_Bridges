// "An English word you like (6+ letters) + your favorite 4-digit number,
// concatenated" — e.g. "sunshine4821". This is a UX convention to help
// students pick a memorable password, enforced client-side only: it is
// NOT a server-side security control (Convex Auth's own password hashing
// is what actually secures the account). Kept in sync by hand with
// convex/adminActions.ts's defensive server-side re-check on the
// admin-reset path.
export const PASSWORD_RULE_REGEX = /^[A-Za-z]{6,}[0-9]{4}$/;

export const PASSWORD_RULE_HINT =
  'Use a word you like (6+ letters) followed by your favorite 4-digit number — e.g. "sunshine4821".';

export function validatePassword(password: string): string | null {
  if (!PASSWORD_RULE_REGEX.test(password)) {
    return PASSWORD_RULE_HINT;
  }
  return null;
}
