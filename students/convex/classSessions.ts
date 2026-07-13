import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const sessions = await ctx.db.query("classSessions").collect();
    return sessions.sort((a, b) => b.importedAt - a.importedAt);
  },
});

export const getSessionDetail = query({
  args: { id: v.id("classSessions") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const session = await ctx.db.get(id);
    if (!session) return null;

    const attendance = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    const reviewEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    const unresolved = reviewEntries.filter((entry) => entry.resolution === undefined);

    return {
      session,
      attendanceCount: attendance.length,
      reviewQueueCount: reviewEntries.length,
      unresolvedCount: unresolved.length,
    };
  },
});
