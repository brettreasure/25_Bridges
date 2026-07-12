import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";

export const listForPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    await requireAdmin(ctx);
    const records = await ctx.db
      .query("duolingoRecords")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .collect();
    return records.sort((a, b) => a.testDate.localeCompare(b.testDate));
  },
});

export const addEntry = mutation({
  args: {
    personId: v.id("people"),
    level: v.string(),
    testDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const level = args.level.trim();
    if (!level) throw new ConvexError("Level is required.");
    if (!args.testDate) throw new ConvexError("Test date is required.");

    await ctx.db.insert("duolingoRecords", {
      personId: args.personId,
      level,
      testDate: args.testDate,
      recordedBy: admin.email,
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});
