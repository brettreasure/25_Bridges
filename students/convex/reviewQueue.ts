import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import type { Id } from "./_generated/dataModel";
import { liveSuggestionsForEntry } from "./lib/matching";

export const listForSession = query({
  args: { sessionId: v.id("classSessions") },
  handler: async (ctx, { sessionId }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("reviewQueue")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});

// Once every entry in a session's queue has a resolution, attendance for
// that session is final. See BUILD_SPEC.md section 3, step 9.
async function finalizeIfComplete(ctx: MutationCtx, sessionId: Id<"classSessions">) {
  const entries = await ctx.db
    .query("reviewQueue")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  const stillUnresolved = entries.some((entry) => entry.resolution === undefined);
  await ctx.db.patch(sessionId, { status: stillUnresolved ? "needs_review" : "finalized" });
}

async function getUnresolvedEntry(ctx: MutationCtx, entryId: Id<"reviewQueue">) {
  const entry = await ctx.db.get(entryId);
  if (!entry) throw new ConvexError("Review entry not found.");
  if (entry.resolution !== undefined) {
    throw new ConvexError("This entry has already been resolved.");
  }
  return entry;
}

export const linkExisting = mutation({
  args: { entryId: v.id("reviewQueue"), personId: v.id("people") },
  handler: async (ctx, { entryId, personId }) => {
    const admin = await requireAdmin(ctx);
    const entry = await getUnresolvedEntry(ctx, entryId);
    const person = await ctx.db.get(personId);
    if (!person) throw new ConvexError("Selected person not found.");

    await ctx.db.insert("attendanceRecords", {
      sessionId: entry.sessionId,
      personId,
      rawNames: [entry.rawName],
      joinTime: entry.joinTime,
      leaveTime: entry.leaveTime,
      durationMinutes: entry.durationMinutes,
      matchMethod: "manual",
      resolvedBy: admin.email,
      resolvedAt: Date.now(),
    });

    // Remember this raw name against the person so it auto-matches next time.
    if (!person.aliases.includes(entry.rawName)) {
      await ctx.db.patch(personId, {
        aliases: [...person.aliases, entry.rawName],
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(entryId, {
      resolution: "linked_existing",
      resolvedPersonId: personId,
      resolvedBy: admin.email,
      resolvedAt: Date.now(),
    });

    await finalizeIfComplete(ctx, entry.sessionId);
  },
});

// Creates a brand-new person (any role) from an unresolved queue entry and
// links this session's attendance to them. Always "approved" directly,
// regardless of role — the "pending" approval queue exists to screen public
// self-registrations, and this mutation is always admin-initiated
// (registrationSource: "admin"), so there's no second approval step needed
// for a person the admin just decided to add.
export const createNewPerson = mutation({
  args: {
    entryId: v.id("reviewQueue"),
    name: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("aide"), v.literal("guest")),
  },
  handler: async (ctx, { entryId, name, role }) => {
    const admin = await requireAdmin(ctx);
    const entry = await getUnresolvedEntry(ctx, entryId);

    const trimmedName = name.trim();
    if (!trimmedName) throw new ConvexError("Name is required.");

    const now = Date.now();
    const personId = await ctx.db.insert("people", {
      name: trimmedName,
      aliases: trimmedName === entry.rawName ? [] : [entry.rawName],
      role,
      approvalStatus: "approved",
      registrationSource: "admin",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("attendanceRecords", {
      sessionId: entry.sessionId,
      personId,
      rawNames: [entry.rawName],
      joinTime: entry.joinTime,
      leaveTime: entry.leaveTime,
      durationMinutes: entry.durationMinutes,
      matchMethod: "manual",
      resolvedBy: admin.email,
      resolvedAt: now,
    });

    await ctx.db.patch(entryId, {
      resolution: role === "guest" ? "marked_guest" : "created_new",
      resolvedPersonId: personId,
      resolvedBy: admin.email,
      resolvedAt: now,
    });

    await finalizeIfComplete(ctx, entry.sessionId);
  },
});

export const ignore = mutation({
  args: { entryId: v.id("reviewQueue") },
  handler: async (ctx, { entryId }) => {
    const admin = await requireAdmin(ctx);
    const entry = await getUnresolvedEntry(ctx, entryId);

    await ctx.db.patch(entryId, {
      resolution: "ignored",
      resolvedBy: admin.email,
      resolvedAt: Date.now(),
    });

    await finalizeIfComplete(ctx, entry.sessionId);
  },
});

// Links every unresolved entry in a session whose live top suggestion is a
// 100% match, without a per-entry click — for a large backlog (e.g. the
// historical import), requiring manual confirmation on unambiguous exact
// matches is pure friction. Anything below a perfect score is left for
// manual review, same as today.
export const bulkResolveExactMatches = mutation({
  args: { sessionId: v.id("classSessions") },
  handler: async (ctx, { sessionId }) => {
    const admin = await requireAdmin(ctx);
    const entries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const unresolved = entries.filter((e) => e.resolution === undefined);
    if (unresolved.length === 0) return { resolvedCount: 0 };

    const allPeople = await ctx.db.query("people").collect();
    // Tracks alias additions across this whole run so a second entry
    // resolving to the same person sees the first entry's new alias
    // instead of overwriting it with a stale copy.
    const aliasesByPerson = new Map(allPeople.map((p) => [p._id, new Set(p.aliases)]));
    const now = Date.now();
    let resolvedCount = 0;

    for (const entry of unresolved) {
      const top = liveSuggestionsForEntry(entry, allPeople)[0];
      if (!top || top.score !== 1) continue;

      await ctx.db.insert("attendanceRecords", {
        sessionId,
        personId: top.personId,
        rawNames: [entry.rawName],
        joinTime: entry.joinTime,
        leaveTime: entry.leaveTime,
        durationMinutes: entry.durationMinutes,
        matchMethod: "exact",
        resolvedBy: admin.email,
        resolvedAt: now,
      });

      const aliases = aliasesByPerson.get(top.personId);
      if (aliases && !aliases.has(entry.rawName)) {
        aliases.add(entry.rawName);
        await ctx.db.patch(top.personId, {
          aliases: [...aliases],
          updatedAt: now,
        });
      }

      await ctx.db.patch(entry._id, {
        resolution: "linked_existing",
        resolvedPersonId: top.personId,
        resolvedBy: admin.email,
        resolvedAt: now,
      });

      resolvedCount++;
    }

    await finalizeIfComplete(ctx, sessionId);
    return { resolvedCount };
  },
});
