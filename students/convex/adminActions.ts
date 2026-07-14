import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { modifyAccountCredentials } from "@convex-dev/auth/server";
import { validatePassword } from "./lib/passwordRule";

// Admin-assisted "forgot password" — there's no email infrastructure in
// this app, so a household calls/messages an admin, who resets their
// login here (typing a new word+4-digit password together with the
// family, the same way the household chose their own originally).
export const resetHouseholdPassword = action({
  args: { email: v.string(), newPassword: v.string() },
  handler: async (ctx, { email, newPassword }) => {
    await ctx.runQuery(internal.adminGuard.assertAdmin, {});
    // Defensive server-side re-check: modifyAccountCredentials bypasses
    // the Password provider's validatePasswordRequirements hook entirely
    // (that hook only runs for signUp/reset-verification flows).
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      throw new ConvexError(passwordError);
    }
    const normalized = email.toLowerCase().trim();
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: normalized, secret: newPassword },
    });
  },
});
