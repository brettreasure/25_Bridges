import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireHousehold, assertOwnsPerson } from "./portalGuard";
import type { Id } from "./_generated/dataModel";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Forked from people.ts's assertNicknameAvailable — duplicated rather than
// imported/shared, same call as the read queries below (see portal.ts's
// sibling functions): this file is the public/household-facing surface and
// deliberately doesn't reach into the admin-only people.ts internals.
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

// Public — no auth required (this powers the claim-account name search,
// before any session exists). Deliberately returns only disambiguating
// fields — never notes/birthdate/phone/email.
export const searchClaimable = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const trimmed = term.trim();
    if (!trimmed) return [];
    const results = await ctx.db
      .query("people")
      .withSearchIndex("search_name", (q) => q.search("name", trimmed))
      .take(20);
    return results
      .filter((p) => p.role === "student" && p.approvalStatus === "approved")
      .map((p) => ({ _id: p._id, name: p.name, nameBurmese: p.nameBurmese, camp: p.camp }));
  },
});

// Public — lets the claim form know, before submitting, whether this
// household email already has a password set, so it can ask for the
// *existing* household password instead of offering to create a new one.
// Reads Convex Auth's own authAccounts table (part of authTables, already
// merged into schema.ts).
export const emailHasPasswordAccount = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.toLowerCase().trim();
    if (!normalized) return false;
    const existing = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", normalized)
      )
      .unique();
    return !!existing;
  },
});

// Public — no auth required (this IS the bootstrap into having an
// account). The client must await this and only THEN call signIn() — see
// convex/auth.ts's createOrUpdateUser for why that ordering matters (it
// avoids a race without needing this to be atomic with account creation).
export const claimPerson = mutation({
  args: { personId: v.id("people"), email: v.string() },
  handler: async (ctx, { personId, email }) => {
    const normalized = email.toLowerCase().trim();
    if (!normalized) throw new ConvexError("Email is required.");

    const person = await ctx.db.get(personId);
    if (!person) throw new ConvexError("Student record not found.");
    if (person.role !== "student" || person.approvalStatus !== "approved") {
      throw new ConvexError("This record can't be claimed.");
    }

    if (person.email && person.email !== normalized) {
      throw new ConvexError(
        "This student is already linked to a different email. If that's wrong, ask an admin for help."
      );
    }
    if (person.email === normalized) {
      return; // idempotent re-claim with the same email (e.g. a second sibling, or a retry)
    }

    await ctx.db.patch(personId, { email: normalized, claimedAt: Date.now(), updatedAt: Date.now() });
  },
});

// Every people row linked to the signed-in household's email. Never throws
// on zero matches — see requireHousehold.
export const myPeople = query({
  args: {},
  handler: async (ctx) => {
    const { people } = await requireHousehold(ctx);
    return people.map((p) => ({ _id: p._id, name: p.name, nameBurmese: p.nameBurmese, camp: p.camp }));
  },
});

// Full editable-profile shape for one of the household's own people —
// explicitly excludes notes (admin-only, "never shown to the student" per
// schema.ts), role, approvalStatus, registrationSource, and email (login
// identity, not part of the editable profile).
export const myProfile = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    await assertOwnsPerson(ctx, personId);
    const person = await ctx.db.get(personId);
    if (!person) throw new ConvexError("Student record not found.");
    return {
      _id: person._id,
      name: person.name,
      nameBurmese: person.nameBurmese,
      nickname: person.nickname,
      camp: person.camp,
      town: person.location?.town,
      region: person.location?.region,
      country: person.location?.country,
      birthdate: person.birthdate,
      ambition: person.ambition,
      school: person.school,
      interests: person.interests,
    };
  },
});

export const myDuolingoHistory = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    await assertOwnsPerson(ctx, personId);
    const records = await ctx.db
      .query("duolingoRecords")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .collect();
    return records.sort((a, b) => a.testDate.localeCompare(b.testDate));
  },
});

export const myAttendanceHistory = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    await assertOwnsPerson(ctx, personId);
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

// Student-editable profile fields — deliberately excludes role,
// approvalStatus, notes (admin-only), and email (login identity; changes
// only via re-claiming or an admin reset).
export const updateMyProfile = mutation({
  args: {
    personId: v.id("people"),
    name: v.optional(v.string()),
    nameBurmese: v.optional(v.string()),
    nickname: v.optional(v.string()),
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
    await assertOwnsPerson(ctx, args.personId);
    const existing = await ctx.db.get(args.personId);
    if (!existing) throw new ConvexError("Student record not found.");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    let aliases = existing.aliases;

    if (args.name !== undefined) {
      const newName = clean(args.name) ?? existing.name;
      if (newName !== existing.name && !aliases.includes(existing.name)) {
        aliases = [...aliases, existing.name];
      }
      patch.name = newName;
    }
    if (args.nameBurmese !== undefined) patch.nameBurmese = clean(args.nameBurmese);
    if (args.camp !== undefined) patch.camp = clean(args.camp);
    if (args.birthdate !== undefined) patch.birthdate = clean(args.birthdate);
    if (args.ambition !== undefined) patch.ambition = clean(args.ambition);
    if (args.school !== undefined) patch.school = clean(args.school);
    if (args.interests !== undefined) patch.interests = clean(args.interests);

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
        await assertNicknameAvailable(ctx, nicknameLower, args.personId);
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

    await ctx.db.patch(args.personId, patch);
  },
});

// Lets a student log their own Duolingo score — shifts that data entry off
// teachers, same as updateMyProfile. recordedBy: "self" distinguishes these
// from admin-entered rows (schema's comment already anticipated this).
export const myAddDuolingoEntry = mutation({
  args: {
    personId: v.id("people"),
    score: v.number(),
    testDate: v.string(),
  },
  handler: async (ctx, args) => {
    await assertOwnsPerson(ctx, args.personId);
    if (!Number.isInteger(args.score) || args.score < 0 || args.score > 160) {
      throw new ConvexError("Score must be a whole number from 0 to 160.");
    }
    if (!args.testDate) throw new ConvexError("Test date is required.");

    await ctx.db.insert("duolingoRecords", {
      personId: args.personId,
      score: args.score,
      testDate: args.testDate,
      recordedBy: "self",
      createdAt: Date.now(),
    });
  },
});
