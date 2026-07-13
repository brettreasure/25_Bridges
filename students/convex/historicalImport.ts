import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { cleanAndSplitName } from "./lib/historicalNames";
import { matchAgainstPeople } from "./lib/matching";
import type { Id } from "./_generated/dataModel";

// One-time historical backfill from a hand-maintained attendance
// spreadsheet, invoked via `npx convex run historicalImport:importDateAttendance`
// from scripts/import-historical-excel.ts — not a browser-facing feature,
// so this is an internalMutation (no admin session to check; the CLI
// invocation itself is the trust boundary).
//
// Reuses the exact same matching/reviewQueue pipeline as the Zoom CSV
// importer (convex/importSession.ts) — only the input shape differs, since
// here we already know exactly who was marked present on this date.
export const importDateAttendance = internalMutation({
  args: {
    date: v.string(), // ISO "YYYY-MM-DD"
    sourceFileName: v.string(),
    rawNames: v.array(v.string()), // raw column-B strings with an 'A' on this date
  },
  handler: async (ctx, args) => {
    const dateMidnightMs = new Date(`${args.date}T00:00:00`).getTime();

    // Reuse an existing session on this date (e.g. a real Zoom import that
    // happens to share a calendar date with this historical data) instead
    // of creating a confusing duplicate.
    let sessionId: Id<"classSessions">;
    const existingSession = await ctx.db
      .query("classSessions")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (existingSession) {
      sessionId = existingSession._id;
    } else {
      sessionId = await ctx.db.insert("classSessions", {
        date: args.date,
        sourceFileName: args.sourceFileName,
        importedBy: "historical-import",
        importedAt: Date.now(),
        status: "importing",
      });
    }

    // Split every raw column-B string (possibly a joint entry) into clean
    // individual names, then dedupe exact-string repeats — the same name
    // can appear on multiple rows (different classes) marked present on
    // the same date.
    const cleanNameToOriginals = new Map<string, string[]>();
    for (const raw of args.rawNames) {
      for (const cleanName of cleanAndSplitName(raw)) {
        const existing = cleanNameToOriginals.get(cleanName);
        if (existing) {
          if (!existing.includes(raw)) existing.push(raw);
        } else {
          cleanNameToOriginals.set(cleanName, [raw]);
        }
      }
    }

    const approvedPeople = await ctx.db
      .query("people")
      .withIndex("by_approvalStatus", (q) => q.eq("approvalStatus", "approved"))
      .collect();

    // Two different raw names on this date can resolve to the same
    // existing person (e.g. listed under two different classes) — merge
    // those into one attendanceRecords row rather than creating two.
    const matchedByPerson = new Map<
      Id<"people">,
      { rawNames: Set<string>; method: "exact" | "fuzzy"; confidence?: number }
    >();
    let reviewCount = 0;

    for (const [cleanName, originals] of cleanNameToOriginals) {
      const match = matchAgainstPeople(cleanName, approvedPeople);

      if (match.method && match.personId) {
        const existing = matchedByPerson.get(match.personId);
        if (existing) {
          for (const raw of originals) existing.rawNames.add(raw);
          if (match.method === "exact") existing.method = "exact";
          if (match.confidence !== undefined) {
            existing.confidence = Math.max(existing.confidence ?? 0, match.confidence);
          }
        } else {
          matchedByPerson.set(match.personId, {
            rawNames: new Set(originals),
            method: match.method,
            confidence: match.confidence,
          });
        }
        continue;
      }

      const topScore = match.suggestions[0]?.score ?? 0;
      await ctx.db.insert("reviewQueue", {
        sessionId,
        rawName: cleanName,
        splitFrom: originals[0] !== cleanName ? originals[0] : undefined,
        joinTime: dateMidnightMs,
        leaveTime: dateMidnightMs,
        durationMinutes: 0,
        reason: topScore >= 0.6 ? "low_confidence_match" : "no_match",
        suggestedMatches: match.suggestions,
        createdAt: Date.now(),
      });
      reviewCount++;
    }

    let autoMatchedCount = 0;
    for (const [personId, entry] of matchedByPerson) {
      await ctx.db.insert("attendanceRecords", {
        sessionId,
        personId,
        rawNames: Array.from(entry.rawNames),
        joinTime: dateMidnightMs,
        leaveTime: dateMidnightMs,
        durationMinutes: 0,
        matchMethod: entry.method,
        matchConfidence: entry.method === "fuzzy" ? entry.confidence : undefined,
      });
      autoMatchedCount++;
    }

    // Recompute status: don't downgrade an already-finalized existing
    // session back to needs_review unless this import actually added
    // unresolved entries.
    if (reviewCount > 0) {
      await ctx.db.patch(sessionId, { status: "needs_review" });
    } else if (!existingSession) {
      await ctx.db.patch(sessionId, { status: "finalized" });
    }

    return { sessionId, autoMatchedCount, reviewCount };
  },
});
