import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";

export const listForSession = query({
  args: { sessionId: v.id("classSessions") },
  handler: async (ctx, { sessionId }) => {
    await requireAdmin(ctx);
    const records = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    return await Promise.all(
      records.map(async (record) => {
        const person = await ctx.db.get(record.personId);
        return { ...record, personName: person?.name ?? "Unknown" };
      })
    );
  },
});

export const listForPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    await requireAdmin(ctx);
    const records = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .collect();
    const withDates = await Promise.all(
      records.map(async (record) => {
        const session = await ctx.db.get(record.sessionId);
        return { ...record, sessionDate: session?.date ?? "" };
      })
    );
    return withDates.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  },
});

// For the /admin/export CSV — every attendance record across every session,
// joined with the person's name and the session's date.
export const exportAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const records = await ctx.db.query("attendanceRecords").collect();
    return await Promise.all(
      records.map(async (record) => {
        const [person, session] = await Promise.all([
          ctx.db.get(record.personId),
          ctx.db.get(record.sessionId),
        ]);
        return {
          personName: person?.name ?? "Unknown",
          role: person?.role ?? "",
          sessionDate: session?.date ?? "",
          durationMinutes: record.durationMinutes,
          matchMethod: record.matchMethod,
          rawNames: record.rawNames.join("; "),
        };
      })
    );
  },
});
