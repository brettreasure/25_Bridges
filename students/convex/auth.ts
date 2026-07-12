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
    // hood) on being a known, active row in `adminUsers` — there's no
    // public admin sign-up, only a small manually-provisioned allowlist.
    // This runs *before* a `users` row is created, so a rejected email
    // never leaves an orphaned account behind.
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      const email = profile.email?.toLowerCase();
      if (!email) {
        throw new ConvexError("Email is required.");
      }
      // `ctx` is typed generically (AnyDataModel) by the auth library, so it
      // doesn't know about our schema's tables/indexes — cast to our
      // concrete DatabaseWriter to query `adminUsers` with real types.
      const db = ctx.db as unknown as DatabaseWriter;
      const admin = await db
        .query("adminUsers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (!admin || !admin.isActive) {
        throw new ConvexError(
          "This email isn't on the admin list for 25 Bridges. Ask an existing admin to add you."
        );
      }
      if (existingUserId) {
        return existingUserId;
      }
      return await db.insert("users", { email });
    },
  },
});
