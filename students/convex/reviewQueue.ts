import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import type { Id } from "./_generated/dataModel";

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

export const createNewStudent = mutation({
  args: { entryId: v.id("reviewQueue"), name: v.string() },
  handler: async (ctx, { entryId, name }) => {
    const admin = await requireAdmin(ctx);
    const entry = await getUnresolvedEntry(ctx, entryId);

    const trimmedName = name.trim();
    if (!trimmedName) throw new ConvexError("Name is required.");

    const now = Date.now();
    const personId = await ctx.db.insert("people", {
      name: trimmedName,
      aliases: trimmedName === entry.rawName ? [] : [entry.rawName],
      role: "student",
      approvalStatus: "pending",
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
      resolution: "created_new",
      resolvedPersonId: personId,
      resolvedBy: admin.email,
      resolvedAt: now,
    });

    await finalizeIfComplete(ctx, entry.sessionId);
  },
});

export const markGuest = mutation({
  args: { entryId: v.id("reviewQueue"), name: v.string() },
  handler: async (ctx, { entryId, name }) => {
    const admin = await requireAdmin(ctx);
    const entry = await getUnresolvedEntry(ctx, entryId);

    const trimmedName = name.trim();
    if (!trimmedName) throw new ConvexError("Name is required.");

    const now = Date.now();
    const personId = await ctx.db.insert("people", {
      name: trimmedName,
      aliases: trimmedName === entry.rawName ? [] : [entry.rawName],
      role: "guest",
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
      resolution: "marked_guest",
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
