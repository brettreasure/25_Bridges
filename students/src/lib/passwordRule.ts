// Single source of truth moved to convex/lib/passwordRule.ts (needed
// server-side, and src/ can import from convex/lib/ but not vice versa —
// see that file for the rule itself and why it's a UX convention, not a
// security control).
export { PASSWORD_RULE_REGEX, PASSWORD_RULE_HINT, validatePassword } from "../../convex/lib/passwordRule";
