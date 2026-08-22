import { v, ConvexError } from "convex/values";
import * as Papa from "papaparse";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import type { Id } from "./_generated/dataModel";
import {
  detectFormat,
  normalizeRows,
  mergeByExactName,
  splitDualNames,
  detectParenthetical,
  looksLikeDevice,
  trySplitJointName,
  type Candidate,
} from "./lib/csv";
import { matchAgainstPeople, type MatchCandidate } from "./lib/matching";
import { mergeAttendanceGroup } from "./lib/attendanceMerge";

interface PipelineCandidate extends Candidate {
  parentheticalAlt?: string;
}

function dedupeTopThree(candidates: MatchCandidate[]): MatchCandidate[] {
  const seen = new Set<string>();
  const deduped: MatchCandidate[] = [];
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (seen.has(candidate.personId)) continue;
    seen.add(candidate.personId);
    deduped.push(candidate);
    if (deduped.length === 3) break;
  }
  return deduped;
}

// Lets the import form warn the admin before they submit, rather than
// after — checked whenever the chosen date changes.
export const checkExistingSessionForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("classSessions")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    if (existing.length === 0) return null;
    const mostRecent = existing.sort((a, b) => b.importedAt - a.importedAt)[0];
    return {
      sessionId: mostRecent._id,
      importedAt: mostRecent.importedAt,
      sourceFileName: mostRecent.sourceFileName,
      status: mostRecent.status,
    };
  },
});

export const importSession = mutation({
  args: {
    sessionDate: v.string(),
    sourceFileName: v.string(),
    csvText: v.string(),
    // Only meaningful when a session already exists for sessionDate.
    // Omitted/"separate" is today's behavior: always insert a new
    // session. "merge" folds this import's attendance into the existing
    // session instead.
    mode: v.optional(v.union(v.literal("merge"), v.literal("separate"))),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const parsed = Papa.parse<Record<string, string>>(args.csvText, {
      header: true,
      skipEmptyLines: true,
    });
    const fields = parsed.meta.fields ?? [];
    const format = detectFormat(fields);
    if (!format) {
      throw new ConvexError(
        "Unrecognized CSV format — expected a Zoom participants export with either Join time/Leave time columns or a Total duration column."
      );
    }

    const sessionDateMidnightMs = new Date(`${args.sessionDate}T00:00:00`).getTime();
    const normalized = normalizeRows(parsed.data, format, sessionDateMidnightMs);

    let sessionId: Id<"classSessions">;
    let mergingIntoExisting = false;
    if (args.mode === "merge") {
      const existing = await ctx.db
        .query("classSessions")
        .withIndex("by_date", (q) => q.eq("date", args.sessionDate))
        .collect();
      if (existing.length > 0) {
        sessionId = existing.sort((a, b) => b.importedAt - a.importedAt)[0]._id;
        mergingIntoExisting = true;
      } else {
        sessionId = await ctx.db.insert("classSessions", {
          date: args.sessionDate,
          sourceFileName: args.sourceFileName,
          importedBy: admin.email,
          importedAt: Date.now(),
          status: "importing",
        });
      }
    } else {
      sessionId = await ctx.db.insert("classSessions", {
        date: args.sessionDate,
        sourceFileName: args.sourceFileName,
        importedBy: admin.email,
        importedAt: Date.now(),
        status: "importing",
      });
    }

    // Step 2 — classify host/admin rows; never routed through student
    // matching, and (since hostEmails isn't linked to a people row here)
    // not written to attendanceRecords either — a safe default that never
    // misattributes a teacher's connection to a student.
    const hostEmails = await ctx.db.query("hostEmails").collect();
    const hostEmailSet = new Set(
      hostEmails.filter((h) => h.isActive).map((h) => h.email.toLowerCase())
    );
    const nonHostRows = normalized.filter(
      (row) => !(row.email && hostEmailSet.has(row.email.toLowerCase()))
    );

    // Step 3 — merge repeat join/leave rows for the same exact raw name.
    const merged = mergeByExactName(nonHostRows);

    // Steps 4 & 5 — a name that's entirely "X (Y)" is treated as a single
    // ambiguous parenthetical unit and never split on & /and, even if Y
    // itself contains one of those separators — UNLESS Y is itself a joint
    // name (e.g. "Eugene Roman (Eugene Roman & Assumpta)" really means two
    // attendees, Eugene Roman and Assumpta, sharing one connection). In
    // that case, expand to one candidate per unique name instead of a
    // single ambiguous entry. Anything else goes through the normal
    // dual/group-name split.
    const candidates: PipelineCandidate[] = merged.flatMap((row) => {
      const parenthetical = detectParenthetical(row.rawName);
      if (parenthetical) {
        const jointNames = trySplitJointName(parenthetical.alt);
        if (jointNames) {
          const uniqueNames = Array.from(new Set([parenthetical.primary, ...jointNames]));
          return uniqueNames.map((name) => ({
            rawName: name,
            splitFrom: row.rawName,
            joinTime: row.joinTime,
            leaveTime: row.leaveTime,
            durationMinutes: row.durationMinutes,
          }));
        }
        return [
          {
            rawName: row.rawName,
            joinTime: row.joinTime,
            leaveTime: row.leaveTime,
            durationMinutes: row.durationMinutes,
            parentheticalAlt: parenthetical.alt,
          },
        ];
      }
      return splitDualNames(row);
    });

    const approvedPeople = await ctx.db
      .query("people")
      .withIndex("by_approvalStatus", (q) => q.eq("approvalStatus", "approved"))
      .collect();

    let reviewCount = 0;
    let autoMatchedCount = 0;

    for (const candidate of candidates) {
      // Parenthetical names always go to review, regardless of match
      // confidence on either side.
      if (candidate.parentheticalAlt) {
        const parenthetical = detectParenthetical(candidate.rawName)!;
        const matchPrimary = matchAgainstPeople(parenthetical.primary, approvedPeople);
        const matchAlt = matchAgainstPeople(parenthetical.alt, approvedPeople);
        const suggestedMatches = dedupeTopThree([
          ...matchPrimary.suggestions,
          ...matchAlt.suggestions,
        ]);

        await ctx.db.insert("reviewQueue", {
          sessionId,
          rawName: candidate.rawName,
          splitFrom: candidate.splitFrom,
          parentheticalAlt: candidate.parentheticalAlt,
          joinTime: candidate.joinTime,
          leaveTime: candidate.leaveTime,
          durationMinutes: candidate.durationMinutes,
          reason: "parenthetical_ambiguous",
          suggestedMatches,
          createdAt: Date.now(),
        });
        reviewCount++;
        continue;
      }

      const match = matchAgainstPeople(candidate.rawName, approvedPeople);

      // Step 6 — device/telephone names: only flagged as unresolved if
      // there's no existing high-confidence match (e.g. an alias recorded
      // from a past manual resolution of this same device string).
      if (looksLikeDevice(candidate.rawName) && match.method === null) {
        await ctx.db.insert("reviewQueue", {
          sessionId,
          rawName: candidate.rawName,
          splitFrom: candidate.splitFrom,
          joinTime: candidate.joinTime,
          leaveTime: candidate.leaveTime,
          durationMinutes: candidate.durationMinutes,
          reason: "device_name",
          suggestedMatches: match.suggestions,
          createdAt: Date.now(),
        });
        reviewCount++;
        continue;
      }

      // Step 7 — fuzzy match everything else.
      if (match.method && match.personId) {
        const newRecord = {
          rawNames: [candidate.rawName],
          joinTime: candidate.joinTime,
          leaveTime: candidate.leaveTime,
          durationMinutes: candidate.durationMinutes,
          matchMethod: match.method,
          matchConfidence: match.method === "fuzzy" ? match.confidence : undefined,
        };
        if (mergingIntoExisting) {
          const existingRecord = await ctx.db
            .query("attendanceRecords")
            .withIndex("by_session_and_person", (q) =>
              q.eq("sessionId", sessionId).eq("personId", match.personId!)
            )
            .unique();
          if (existingRecord) {
            await ctx.db.patch(existingRecord._id, mergeAttendanceGroup([existingRecord, newRecord]));
          } else {
            await ctx.db.insert("attendanceRecords", { sessionId, personId: match.personId, ...newRecord });
          }
        } else {
          await ctx.db.insert("attendanceRecords", { sessionId, personId: match.personId, ...newRecord });
        }
        autoMatchedCount++;
      } else {
        const topScore = match.suggestions[0]?.score ?? 0;
        await ctx.db.insert("reviewQueue", {
          sessionId,
          rawName: candidate.rawName,
          splitFrom: candidate.splitFrom,
          joinTime: candidate.joinTime,
          leaveTime: candidate.leaveTime,
          durationMinutes: candidate.durationMinutes,
          reason: topScore >= 0.6 ? "low_confidence_match" : "no_match",
          suggestedMatches: match.suggestions,
          createdAt: Date.now(),
        });
        reviewCount++;
      }
    }

    const allQueueEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const stillUnresolved = allQueueEntries.some((e) => e.resolution === undefined);
    await ctx.db.patch(sessionId, { status: stillUnresolved ? "needs_review" : "finalized" });

    return { sessionId, autoMatchedCount, reviewCount };
  },
});
