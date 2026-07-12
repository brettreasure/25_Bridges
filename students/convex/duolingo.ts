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

// For the People directory's "Duo Level" column — the most recent score
// per person, across everyone, in one query rather than one per row.
export const latestForAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("duolingoRecords").collect();
    const latestByPerson = new Map<string, (typeof all)[number]>();
    for (const record of all) {
      const existing = latestByPerson.get(record.personId);
      if (!existing || record.testDate > existing.testDate) {
        latestByPerson.set(record.personId, record);
      }
    }
    return Object.fromEntries(latestByPerson);
  },
});

export const addEntry = mutation({
  args: {
    personId: v.id("people"),
    score: v.number(),
    testDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!Number.isInteger(args.score) || args.score < 0 || args.score > 160) {
      throw new ConvexError("Score must be a whole number from 0 to 160.");
    }
    if (!args.testDate) throw new ConvexError("Test date is required.");

    await ctx.db.insert("duolingoRecords", {
      personId: args.personId,
      score: args.score,
      testDate: args.testDate,
      recordedBy: admin.email,
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});
