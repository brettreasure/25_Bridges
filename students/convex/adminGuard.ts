import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery, type QueryCtx, type MutationCtx } from "./_generated/server";

// Shared gate for every admin-only query/mutation. A valid session alone
// isn't enough to trust long-term — a JWT can outlive an admin being
// deactivated — so this re-checks `adminUsers.isActive` on every call.
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("Not signed in.");
  }
  const user = await ctx.db.get(userId);
  const email = (user as { email?: string } | null)?.email?.toLowerCase();
  if (!email) {
    throw new ConvexError("Not authorized.");
  }
  const admin = await ctx.db
    .query("adminUsers")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  if (!admin || !admin.isActive) {
    throw new ConvexError("Not authorized.");
  }
  return admin;
}

// Actions don't have `ctx.db`, so `requireAdmin` can't run directly inside
// one — this wraps it as an internalQuery an action can call via
// `ctx.runQuery` (which forwards the caller's auth identity), for the
// admin-only household-password-reset action in convex/adminActions.ts.
export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
  },
});
