// Convex schema — 25 Bridges Student Database & Attendance System
//
// Based on the project's schema.ts spec, with one rename: nameChin -> nameBurmese
// (the secondary form language is Burmese, not Hakha Chin — see BUILD_SPEC.md).
// authTables (users/sessions/accounts) are merged in for Convex Auth.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // ---------------------------------------------------------------------
  // people: every student, teacher, aide, and guest is one row here.
  // Role defaults to "student" at the application layer (enforced in the
  // mutation, not just the UI) whenever a record is created via the
  // public self-registration form.
  // ---------------------------------------------------------------------
  people: defineTable({
    name: v.string(), // preferred display name, as the person/admin entered it
    nameBurmese: v.optional(v.string()), // name as the student writes it in
    // Burmese (Myanmar script) — a separate optional field alongside the
    // primary name.

    nickname: v.optional(v.string()), // optional English nickname, as typed
    nicknameLower: v.optional(v.string()), // lowercased mirror of `nickname`,
    // maintained by the mutation on every write — used for the case-
    // insensitive uniqueness check (see BUILD_SPEC.md "Nickname uniqueness").
    // Only ever set when `nickname` is non-empty; two people with no
    // nickname at all must NOT collide with each other.

    aliases: v.array(v.string()), // known name variants: nicknames, device
    // names, honorific-stripped forms, misspellings seen in past Zoom
    // exports — grows automatically as the CSV importer learns matches.
    // `nickname` (when set) is included here too, so Zoom attendance can
    // match on it directly.

    role: v.union(
      v.literal("student"),
      v.literal("teacher"),
      v.literal("aide"),
      v.literal("guest")
    ),

    approvalStatus: v.union(
      v.literal("pending"), // awaiting admin review (self-registered)
      v.literal("approved"),
      v.literal("rejected")
    ),
    registrationSource: v.union(
      v.literal("self"), // submitted via the public form
      v.literal("admin") // added directly by an admin
    ),

    email: v.optional(v.string()),
    phone: v.optional(v.string()),

    camp: v.optional(v.string()),
    location: v.optional(
      v.object({
        town: v.optional(v.string()),
        region: v.optional(v.string()),
        country: v.optional(v.string()),
      })
    ),

    // Store as an ISO date string ("YYYY-MM-DD"). Age is never stored —
    // it's derived at query/display time (see BUILD_SPEC.md "Age
    // calculation") so it's always current.
    birthdate: v.optional(v.string()),

    isUnder13: v.optional(v.boolean()), // self-reported at registration via
    // the "Under 13?" toggle — drives the parent/guardian gate on /register.
    parentGuardianName: v.optional(v.string()), // self-attested by the
    // registrant when isUnder13 is true — NOT verified consent, just a
    // typed name. See BUILD_SPEC.md "Things Not To Guess On".
    parentGuardianConsentConfirmed: v.optional(v.boolean()), // admin-only:
    // true once an admin has attempted to verify permission with the named
    // parent/guardian (phone/in person/community leader). Never set by the
    // public form. Does not block approve/reject.
    parentGuardianConsentConfirmedBy: v.optional(v.string()), // admin email,
    // mirrors approvedBy
    parentGuardianConsentConfirmedAt: v.optional(v.number()), // epoch ms,
    // mirrors approvedAt

    ambition: v.optional(v.string()),
    school: v.optional(v.string()),
    interests: v.optional(v.string()),

    notes: v.optional(v.string()), // admin-only, never shown to the student

    approvedBy: v.optional(v.string()), // admin identifier
    approvedAt: v.optional(v.number()), // epoch ms

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_role", ["role"])
    .index("by_approvalStatus", ["approvalStatus"])
    .index("by_camp", ["camp"])
    // Uniqueness for `nickname` is enforced in application code, not by
    // the database (Convex has no unique-constraint primitive) — this
    // index is what makes that check a single indexed lookup rather than
    // a full table scan. See BUILD_SPEC.md "Nickname uniqueness."
    .index("by_nicknameLower", ["nicknameLower"])
    // NOT 1:1 — multiple people (siblings sharing one household email) can
    // have the same `email`. Every lookup on this index must use
    // `.collect()`/`.first()`, never `.unique()`. See convex/portalGuard.ts.
    .index("by_email", ["email"])
    // Convex doesn't do fuzzy/full-text matching in the base query layer —
    // pull all approved people into memory for the matching step, or use
    // a Convex search index for a coarse first pass if the roster grows
    // large enough to matter (unlikely at this program's scale).
    .searchIndex("search_name", { searchField: "name" }),

  // ---------------------------------------------------------------------
  // duolingoRecords: a history, not a single field, so progress over
  // time is visible. One row per test/check.
  // ---------------------------------------------------------------------
  duolingoRecords: defineTable({
    personId: v.id("people"),
    score: v.number(), // Duolingo English Test score, 0-160. CEFR level
    // (A1-C2) is derived from this at display time, never stored — see
    // src/lib/duolingo.ts.
    testDate: v.string(), // ISO date "YYYY-MM-DD"
    recordedBy: v.optional(v.string()), // admin identifier, or "self"
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_person", ["personId"]),

  // ---------------------------------------------------------------------
  // classSessions: one row per class, created when a Zoom CSV is
  // imported (or manually, if attendance is ever logged without a CSV).
  // ---------------------------------------------------------------------
  classSessions: defineTable({
    date: v.string(), // ISO date "YYYY-MM-DD"
    label: v.optional(v.string()), // e.g. a lesson theme/title
    sourceFileName: v.optional(v.string()), // original CSV filename
    importedBy: v.optional(v.string()),
    importedAt: v.number(),
    status: v.union(
      v.literal("importing"), // parsed, matching in progress
      v.literal("needs_review"), // review queue has unresolved entries
      v.literal("finalized") // all entries resolved, attendance is final
    ),
  }).index("by_date", ["date"]),

  // ---------------------------------------------------------------------
  // attendanceRecords: one row per (session, person) once resolved.
  // Unresolved rows live in reviewQueue until an admin resolves them,
  // at which point a row here is created/updated.
  // ---------------------------------------------------------------------
  attendanceRecords: defineTable({
    sessionId: v.id("classSessions"),
    personId: v.id("people"),

    rawNames: v.array(v.string()), // every raw CSV name string that fed
    // into this record (there can be more than one after a rejoin/merge)

    joinTime: v.number(), // epoch ms, earliest join across merged rows
    leaveTime: v.number(), // epoch ms, latest leave across merged rows
    durationMinutes: v.number(), // summed across merged rows

    matchMethod: v.union(
      v.literal("exact"),
      v.literal("fuzzy"),
      v.literal("manual"),
      v.literal("host_email") // matched via known admin/teacher email
    ),
    matchConfidence: v.optional(v.number()), // 0–1, present for fuzzy matches

    resolvedBy: v.optional(v.string()), // admin identifier, if manual
    resolvedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_person", ["personId"])
    .index("by_session_and_person", ["sessionId", "personId"]),

  // ---------------------------------------------------------------------
  // reviewQueue: anything the importer couldn't confidently resolve on
  // its own. Cleared out (not deleted — see `resolution`) as the admin
  // works through it.
  // ---------------------------------------------------------------------
  reviewQueue: defineTable({
    sessionId: v.id("classSessions"),

    rawName: v.string(), // the CSV name string as it appeared (post
    // split, if it was part of a dual/group entry)
    splitFrom: v.optional(v.string()), // original joint string, if this
    // entry was produced by splitting e.g. "JOSEPH & EMILY"
    parentheticalAlt: v.optional(v.string()), // e.g. "Van Ro Sun" out of
    // "Rhai Sueng (Van Ro Sun)" — surfaced as an extra match candidate

    joinTime: v.number(),
    leaveTime: v.number(),
    durationMinutes: v.number(),

    reason: v.union(
      v.literal("device_name"), // looks like a phone/device, not a name
      v.literal("dual_name_split"), // came from splitting a joint entry
      v.literal("parenthetical_ambiguous"), // "Name (Other Name)" pattern
      v.literal("low_confidence_match"), // fuzzy score in the uncertain band
      v.literal("no_match") // no plausible candidate at all
    ),

    suggestedMatches: v.array(
      v.object({
        personId: v.id("people"),
        name: v.string(),
        score: v.number(), // 0–1 fuzzy match score
      })
    ),

    resolution: v.optional(
      v.union(
        v.literal("linked_existing"),
        v.literal("created_new"),
        v.literal("marked_guest"),
        v.literal("ignored")
      )
    ),
    resolvedPersonId: v.optional(v.id("people")),
    resolvedBy: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_resolution", ["resolution"]),

  // ---------------------------------------------------------------------
  // adminUsers: the small, manually-provisioned set of people who can
  // log into the management side of the tool. Not the same thing as a
  // "teacher" role in `people` — some admins may not teach, and some
  // teachers may not need admin access.
  // ---------------------------------------------------------------------
  adminUsers: defineTable({
    email: v.string(),
    name: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // ---------------------------------------------------------------------
  // hostEmails: known Zoom host/account emails that should be classified
  // as teacher/admin attendance during CSV import, never routed through
  // student name matching (BUILD_SPEC.md section 3, step 2). Kept as
  // data, not a hardcoded string, so it can grow without a code change.
  // ---------------------------------------------------------------------
  hostEmails: defineTable({
    email: v.string(),
    label: v.optional(v.string()), // e.g. "25 Bridges Zoom host account"
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
