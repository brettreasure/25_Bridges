import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import type { DatabaseWriter } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = (params.email as string)?.toLowerCase().trim();
        if (!email) {
          throw new Error("Email is required.");
        }
        return { email };
      },
    }),
  ],
  callbacks: {
    // Gate every sign-in (including sign-up, which is a sign-in under the
    // hood) on being either a known, active row in `adminUsers`, OR an
    // email already attached to at least one `people` row (a household
    // that's been through the /portal/claim flow, which patches
    // `people.email` *before* ever calling signIn — see convex/portal.ts's
    // claimPerson for why that ordering is what makes this safe without a
    // race). There's no public admin sign-up; the only public sign-up path
    // is the claim flow. This runs *before* a `users` row is created, so a
    // rejected email never leaves an orphaned account behind.
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      const email = profile.email?.toLowerCase();
      if (!email) {
        throw new ConvexError("Email is required.");
      }
      // `ctx` is typed generically (AnyDataModel) by the auth library, so it
      // doesn't know about our schema's tables/indexes — cast to our
      // concrete DatabaseWriter to query with real types.
      const db = ctx.db as unknown as DatabaseWriter;
      const admin = await db
        .query("adminUsers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      const isActiveAdmin = !!admin && admin.isActive;

      // `people.by_email` is NOT 1:1 (siblings can share a household
      // email) — `.first()` here only checks existence, never assume
      // uniqueness on this index.
      const linkedPerson = isActiveAdmin
        ? null
        : await db
            .query("people")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();

      if (!isActiveAdmin && !linkedPerson) {
        throw new ConvexError(
          "This email isn't recognized. Admins: ask an existing admin to add you. Students: claim your account at /portal/claim first."
        );
      }
      if (existingUserId) {
        return existingUserId;
      }
      return await db.insert("users", { email });
    },
  },
});
