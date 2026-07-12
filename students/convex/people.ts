import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import type { Id } from "./_generated/dataModel";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Re-run inside the mutation transaction — the live check in the UI is only
// a courtesy, this is the actual guarantee against a race between two
// near-simultaneous submissions. See BUILD_SPEC.md "Nickname uniqueness".
async function assertNicknameAvailable(
  ctx: { db: any },
  nicknameLower: string,
  excludeId?: Id<"people">
) {
  const existing = await ctx.db
    .query("people")
    .withIndex("by_nicknameLower", (q: any) => q.eq("nicknameLower", nicknameLower))
    .unique();
  if (existing && existing._id !== excludeId) {
    throw new ConvexError("That nickname is already taken — try another.");
  }
}

// Public — no auth required. Used by the live in-form nickname check.
export const checkNicknameAvailable = query({
  args: { nickname: v.string() },
  handler: async (ctx, { nickname }) => {
    const nicknameLower = nickname.trim().toLowerCase();
    if (!nicknameLower) return true;
    const existing = await ctx.db
      .query("people")
      .withIndex("by_nicknameLower", (q) => q.eq("nicknameLower", nicknameLower))
      .unique();
    return !existing;
  },
});

// Public — the self-registration form. Always creates a pending student;
// never surfaces other people's data back to the caller.
export const register = mutation({
  args: {
    name: v.string(),
    nameBurmese: v.optional(v.string()),
    nickname: v.optional(v.string()),
    email: v.optional(v.string()),
    camp: v.optional(v.string()),
    town: v.optional(v.string()),
    region: v.optional(v.string()),
    country: v.optional(v.string()),
    birthdate: v.optional(v.string()),
    ambition: v.optional(v.string()),
    school: v.optional(v.string()),
    interests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) {
      throw new ConvexError("Name is required.");
    }

    const nickname = clean(args.nickname);
    const nicknameLower = nickname?.toLowerCase();
    if (nicknameLower) {
      await assertNicknameAvailable(ctx, nicknameLower);
    }

    const town = clean(args.town);
    const region = clean(args.region);
    const country = clean(args.country);
    const hasLocation = !!(town || region || country);

    const now = Date.now();
    await ctx.db.insert("people", {
      name,
      nameBurmese: clean(args.nameBurmese),
      nickname,
      nicknameLower,
      aliases: nickname ? [nickname] : [],
      role: "student",
      approvalStatus: "pending",
      registrationSource: "self",
      email: clean(args.email),
      camp: clean(args.camp),
      location: hasLocation ? { town, region, country } : undefined,
      birthdate: clean(args.birthdate),
      ambition: clean(args.ambition),
      school: clean(args.school),
      interests: clean(args.interests),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listByApproval = query({
  args: { approvalStatus: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")) },
  handler: async (ctx, { approvalStatus }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("people")
      .withIndex("by_approvalStatus", (q) => q.eq("approvalStatus", approvalStatus))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {
    role: v.optional(v.union(v.literal("student"), v.literal("teacher"), v.literal("aide"), v.literal("guest"))),
    approvalStatus: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, { role, approvalStatus }) => {
    await requireAdmin(ctx);
    let results = role
      ? await ctx.db.query("people").withIndex("by_role", (q) => q.eq("role", role)).collect()
      : await ctx.db.query("people").collect();
    if (approvalStatus) {
      results = results.filter((p) => p.approvalStatus === approvalStatus);
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getPerson = query({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    return await ctx.db.get(id);
  },
});

export const approve = mutation({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(id, {
      approvalStatus: "approved",
      approvedBy: admin.email,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const reject = mutation({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(id, {
      approvalStatus: "rejected",
      approvedBy: admin.email,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Consolidates a duplicate person record (e.g. the same student ended up
// with two rows under different names) into a single surviving record.
// Moves attendance and Duolingo history over, folds the source's name/
// nickname/aliases into the target's aliases so both names keep matching
// in future imports, then deletes the source.
export const mergeInto = mutation({
  args: { sourceId: v.id("people"), targetId: v.id("people") },
  handler: async (ctx, { sourceId, targetId }) => {
    await requireAdmin(ctx);
    if (sourceId === targetId) {
      throw new ConvexError("Can't merge a person into themselves.");
    }
    const source = await ctx.db.get(sourceId);
    const target = await ctx.db.get(targetId);
    if (!source || !target) {
      throw new ConvexError("Person not found.");
    }

    const attendance = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_person", (q) => q.eq("personId", sourceId))
      .collect();
    for (const record of attendance) {
      await ctx.db.patch(record._id, { personId: targetId });
    }

    const duolingo = await ctx.db
      .query("duolingoRecords")
      .withIndex("by_person", (q) => q.eq("personId", sourceId))
      .collect();
    for (const record of duolingo) {
      await ctx.db.patch(record._id, { personId: targetId });
    }

    const mergedAliases = new Set(target.aliases);
    mergedAliases.add(source.name);
    if (source.nickname) mergedAliases.add(source.nickname);
    for (const alias of source.aliases) mergedAliases.add(alias);

    await ctx.db.patch(targetId, {
      aliases: Array.from(mergedAliases),
      updatedAt: Date.now(),
    });

    await ctx.db.delete(sourceId);
  },
});

// Permanently removes a person and their attendance/Duolingo history — for
// cleaning up test records created while trying out the tool. Does not
// touch reviewQueue entries that reference this person as resolvedPersonId;
// those stay as a resolved audit trail even if the person is gone.
export const deletePerson = mutation({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) {
      throw new ConvexError("Person not found.");
    }

    const attendance = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_person", (q) => q.eq("personId", id))
      .collect();
    for (const record of attendance) {
      await ctx.db.delete(record._id);
    }

    const duolingo = await ctx.db
      .query("duolingoRecords")
      .withIndex("by_person", (q) => q.eq("personId", id))
      .collect();
    for (const record of duolingo) {
      await ctx.db.delete(record._id);
    }

    await ctx.db.delete(id);
  },
});

export const updatePerson = mutation({
  args: {
    id: v.id("people"),
    name: v.optional(v.string()),
    nameBurmese: v.optional(v.string()),
    nickname: v.optional(v.string()),
    role: v.optional(v.union(v.literal("student"), v.literal("teacher"), v.literal("aide"), v.literal("guest"))),
    email: v.optional(v.string()),
    camp: v.optional(v.string()),
    town: v.optional(v.string()),
    region: v.optional(v.string()),
    country: v.optional(v.string()),
    birthdate: v.optional(v.string()),
    ambition: v.optional(v.string()),
    school: v.optional(v.string()),
    interests: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError("Person not found.");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    let aliases = existing.aliases;

    if (args.name !== undefined) {
      const newName = clean(args.name) ?? existing.name;
      // Renaming (e.g. a student turns out to go by a different name)
      // shouldn't lose the old name as a match key — otherwise a future
      // CSV import using their old Zoom display name would no longer
      // find them and would create a duplicate person.
      if (newName !== existing.name && !aliases.includes(existing.name)) {
        aliases = [...aliases, existing.name];
      }
      patch.name = newName;
    }
    if (args.nameBurmese !== undefined) patch.nameBurmese = clean(args.nameBurmese);
    if (args.role !== undefined) patch.role = args.role;
    if (args.email !== undefined) patch.email = clean(args.email);
    if (args.camp !== undefined) patch.camp = clean(args.camp);
    if (args.birthdate !== undefined) patch.birthdate = clean(args.birthdate);
    if (args.ambition !== undefined) patch.ambition = clean(args.ambition);
    if (args.school !== undefined) patch.school = clean(args.school);
    if (args.interests !== undefined) patch.interests = clean(args.interests);
    if (args.notes !== undefined) patch.notes = clean(args.notes);

    if (args.town !== undefined || args.region !== undefined || args.country !== undefined) {
      const town = args.town !== undefined ? clean(args.town) : existing.location?.town;
      const region = args.region !== undefined ? clean(args.region) : existing.location?.region;
      const country = args.country !== undefined ? clean(args.country) : existing.location?.country;
      patch.location = town || region || country ? { town, region, country } : undefined;
    }

    if (args.nickname !== undefined) {
      const nickname = clean(args.nickname);
      const nicknameLower = nickname?.toLowerCase();
      if (nicknameLower) {
        await assertNicknameAvailable(ctx, nicknameLower, args.id);
      }
      patch.nickname = nickname;
      patch.nicknameLower = nicknameLower;
      if (nickname && !aliases.includes(nickname)) {
        aliases = [...aliases, nickname];
      }
    }

    if (aliases !== existing.aliases) {
      patch.aliases = aliases;
    }

    await ctx.db.patch(args.id, patch);
  },
});
