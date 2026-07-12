import { internalMutation } from "./_generated/server";

// One-off seed for the small, manually-provisioned admin set and the known
// Zoom host/account emails. Run once via:
//   npx convex run adminUsers:seed
// Safe to re-run — skips rows that already exist by email.
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admins = [
      { email: "treasure@freebeer.com.au", name: "Bret" },
      { email: "president.chai22@gmail.com", name: "Christalin" },
    ];
    for (const admin of admins) {
      const email = admin.email.toLowerCase();
      const existing = await ctx.db
        .query("adminUsers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (!existing) {
        await ctx.db.insert("adminUsers", {
          email,
          name: admin.name,
          isActive: true,
          createdAt: Date.now(),
        });
      }
    }

    const hostEmails = [
      { email: "info.chai22@gmail.com", label: "25 Bridges Zoom host account" },
    ];
    for (const host of hostEmails) {
      const email = host.email.toLowerCase();
      const existing = await ctx.db
        .query("hostEmails")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (!existing) {
        await ctx.db.insert("hostEmails", {
          email,
          label: host.label,
          isActive: true,
          createdAt: Date.now(),
        });
      }
    }
  },
});
