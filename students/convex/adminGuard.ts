import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

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
