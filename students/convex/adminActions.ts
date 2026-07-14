import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { modifyAccountCredentials } from "@convex-dev/auth/server";

// Kept in sync with src/lib/passwordRule.ts by hand — convex/ and src/ are
// bundled separately and this app has no existing precedent for convex/
// importing from src/ (only from convex/lib/). This is a defensive
// server-side re-check: modifyAccountCredentials bypasses the Password
// provider's own validation hook entirely, and the client-side check is a
// UX convention, not a security control (see passwordRule.ts).
const PASSWORD_RULE = /^[A-Za-z]{6,}[0-9]{4}$/;

// Admin-assisted "forgot password" — there's no email infrastructure in
// this app, so a household calls/messages an admin, who resets their
// login here (typing a new word+4-digit password together with the
// family, the same way the household chose their own originally).
export const resetHouseholdPassword = action({
  args: { email: v.string(), newPassword: v.string() },
  handler: async (ctx, { email, newPassword }) => {
    await ctx.runQuery(internal.adminGuard.assertAdmin, {});
    if (!PASSWORD_RULE.test(newPassword)) {
      throw new ConvexError("Password must be a word (6+ letters) followed by a 4-digit number.");
    }
    const normalized = email.toLowerCase().trim();
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: normalized, secret: newPassword },
    });
  },
});
