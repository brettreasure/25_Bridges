import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Resolves the signed-in household's email and every `people` row it's
// linked to (via /portal/claim). Unlike requireAdmin, this does NOT throw
// when there are zero matching people — an authenticated-but-unlinked
// session (e.g. an admin account wandering into /portal) should render a
// friendly "no records linked" empty state, not crash the whole page (this
// app has no error boundary around routes).
export async function requireHousehold(
  ctx: QueryCtx | MutationCtx
): Promise<{ email: string; people: Doc<"people">[] }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("Not signed in.");
  }
  const user = await ctx.db.get(userId);
  const email = (user as { email?: string } | null)?.email?.toLowerCase();
  if (!email) {
    throw new ConvexError("Not signed in.");
  }
  const allLinked = await ctx.db
    .query("people")
    .withIndex("by_email", (q) => q.eq("email", email))
    // NOT 1:1 — siblings can share a household email. .collect(), never
    // .unique().
    .collect();
  // Only rows that actually completed the claim flow (claimedAt set) and
  // are still approved count — mirrors the same check createOrUpdateUser
  // makes at sign-in time (convex/auth.ts), so access revokes promptly
  // (e.g. a claimed student later rejected) instead of surviving on an
  // existing session's JWT until it happens to expire.
  const people = allLinked.filter((p) => p.claimedAt !== undefined && p.approvalStatus === "approved");
  return { email, people };
}

// Used by every portal query/mutation that targets one specific person
// (Duolingo entries, profile edits) — a personId not in the caller's own
// household only ever happens via a hand-crafted client call, since normal
// navigation only ever offers the household's own linked people.
export async function assertOwnsPerson(ctx: QueryCtx | MutationCtx, personId: Id<"people">) {
  const { people } = await requireHousehold(ctx);
  if (!people.some((p) => p._id === personId)) {
    throw new ConvexError("Not authorized for this student.");
  }
}
