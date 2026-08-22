import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { mergeAttendanceGroup, type AttendanceRecordLike } from "./lib/attendanceMerge";

// One-off cleanup for classSessions rows that share a date — historically
// created as separate, unlinked imports before duplicate-date detection
// existed. CLI-only, invoked via scripts/merge-duplicate-sessions.ts, same
// trust model as historicalImport.ts (the CLI invocation is the boundary,
// no requireAdmin call needed).

export const findDuplicateDates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("classSessions").collect();
    const byDate = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const list = byDate.get(s.date);
      if (list) list.push(s);
      else byDate.set(s.date, [s]);
    }
    return Array.from(byDate.entries())
      .filter(([, list]) => list.length > 1)
      .map(([date, list]) => ({ date, count: list.length }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const mergeSessionsForDate = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const sessions = await ctx.db
      .query("classSessions")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    if (sessions.length <= 1) {
      return { merged: false, mergedCount: 0 };
    }

    // Earliest-imported session survives — it's the one most likely
    // already reviewed/resolved, and keeps any bookmarked review link for
    // this date's first import working.
    const [survivor, ...duplicates] = sessions.sort(
      (a, b) => a.importedAt - b.importedAt || a._creationTime - b._creationTime
    );

    // Merge attendanceRecords by personId across every session being
    // merged (including defensively within the survivor itself, in case
    // it already had >1 row for the same person) — this is what makes it
    // impossible to end up with two rows sharing (survivor._id, personId).
    const byPerson = new Map<Id<"people">, AttendanceRecordLike[]>();
    const survivorRecordIdByPerson = new Map<Id<"people">, Id<"attendanceRecords">>();
    const idsToDelete: Id<"attendanceRecords">[] = [];

    for (const session of sessions) {
      const records = await ctx.db
        .query("attendanceRecords")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const r of records) {
        const group = byPerson.get(r.personId);
        if (group) group.push(r);
        else byPerson.set(r.personId, [r]);
        if (session._id === survivor._id) {
          survivorRecordIdByPerson.set(r.personId, r._id);
        } else {
          idsToDelete.push(r._id);
        }
      }
    }

    for (const [personId, group] of byPerson) {
      const merged = mergeAttendanceGroup(group);
      const existingId = survivorRecordIdByPerson.get(personId);
      if (existingId) {
        await ctx.db.patch(existingId, merged);
      } else {
        await ctx.db.insert("attendanceRecords", { sessionId: survivor._id, personId, ...merged });
      }
    }
    for (const id of idsToDelete) {
      await ctx.db.delete(id);
    }

    // reviewQueue entries are keyed per raw name, not per person — no
    // collision possible, just repoint them onto the survivor.
    for (const dup of duplicates) {
      const entries = await ctx.db
        .query("reviewQueue")
        .withIndex("by_session", (q) => q.eq("sessionId", dup._id))
        .collect();
      for (const entry of entries) {
        await ctx.db.patch(entry._id, { sessionId: survivor._id });
      }
    }

    const remainingQueue = await ctx.db
      .query("reviewQueue")
      .withIndex("by_session", (q) => q.eq("sessionId", survivor._id))
      .collect();
    const stillUnresolved = remainingQueue.some((e) => e.resolution === undefined);
    const combinedSourceFileName = Array.from(
      new Set(sessions.map((s) => s.sourceFileName).filter((s): s is string => !!s))
    ).join("; ");

    await ctx.db.patch(survivor._id, {
      status: stillUnresolved ? "needs_review" : "finalized",
      sourceFileName: combinedSourceFileName || undefined,
      label: survivor.label ?? duplicates.find((d) => d.label)?.label,
    });

    for (const dup of duplicates) {
      await ctx.db.delete(dup._id);
    }

    return { merged: true, survivorId: survivor._id, mergedCount: duplicates.length };
  },
});
