# Build Spec — 25 Bridges Student Database & Attendance System

For: Claude Code
Reference docs in this folder: `PRD.md` (requirements/rationale), `schema.ts` (Convex schema — copy as-is into `convex/schema.ts`)

This spec assumes you've read `PRD.md` for the "why." This document is the "how" — stack, structure, algorithms, and screens.

---

## 1. Stack

- **Backend/database:** Convex (schema in `schema.ts` in this folder — use it directly).
- **Frontend:** React + Vite, TypeScript. Reasons: 25Bridges.org itself is static HTML/CSS/JS with no build step, so this app is a **separate deployable** (its own repo/build), not bolted onto the existing site's codebase.
- **Auth (admin side only):** Convex Auth, email/password or magic-link, restricted to rows in the `adminUsers` table. The public registration form requires no auth at all.
- **Hosting:** Deploy the frontend to Vercel or Netlify (either works fine with Vite + Convex); Convex hosts its own backend. Result is a URL like `students.25bridges.org` or `app.25bridges.org` (CNAME onto the hosting provider).
- **Embedding into 25Bridges.org:** Since the main site is hand-built HTML/JS, don't try to inject React into it. Instead:
  - Add a nav link/button on 25bridges.org pointing to the registration form's URL (opens the deployed app), **or**
  - Embed the registration form specifically via `<iframe src="https://students.25bridges.org/register">` on an existing page, if Bret wants it to feel native to the site.
  - The admin panel is never embedded — it's a separate authenticated area of the same deployed app (e.g. `/admin`), not linked from the public site at all.

## 2. Fuzzy Matching

Use a small, dependency-light string similarity library — `fastest-levenshtein` or `string-similarity` both work; pick one and normalize before comparing:

1. Lowercase, trim, collapse whitespace.
2. Strip known honorific prefixes/suffixes before comparing (configurable list, seed with: `Sayama`, `Saya`, `Pu`, `Pi`, `Pastor`, `Rev`, `Dr`). Stripping one of these is itself a signal — surface it to the admin as "possible teacher/aide" when suggesting a role for a brand-new match.
3. Compare the normalized raw name against every `people.name`, `people.nickname`, and every entry in `people.aliases` for all **approved** people. Take the best score across all candidates.
4. Thresholds (tune after real usage, but start here):
   - **≥ 0.90:** auto-match, `matchMethod: "fuzzy"`, store the score.
   - **0.60–0.89:** send to `reviewQueue` with `reason: "low_confidence_match"` and the top 3 candidates as `suggestedMatches`.
   - **< 0.60:** send to `reviewQueue` with `reason: "no_match"` (empty or near-empty `suggestedMatches`).
5. Exact string match (post-normalization) short-circuits straight to `matchMethod: "exact"` without running the fuzzy comparison.

## 3. CSV Import Pipeline

Input: the Zoom "participants" export (columns: `Name (original name), Email, Join time, Leave time, Duration (minutes), Guest, In waiting room`).

Run these steps **in order** — later steps depend on earlier ones having already cleaned the data:

### Step 1 — Parse & normalize rows
Parse the CSV (e.g. `papaparse` on the frontend, or parse server-side in a Convex action). Convert `Join time` / `Leave time` to epoch ms.

### Step 2 — Classify host/admin rows
For any row whose `Email` matches an entry in `adminUsers` (or a small configurable allowlist of known host emails, e.g. `info.chai22@gmail.com`), classify it as teacher/admin attendance immediately — `matchMethod: "host_email"`. Do not run these rows through name matching at all, even if the display name varies between rows (this is the "25 Bridges" / "#Sayama Christalin" pattern — same account, different display name per join).

### Step 3 — Merge repeat join/leave rows
Group remaining rows by **exact raw name string** within the same session. For each group: `joinTime` = earliest, `leaveTime` = latest, `durationMinutes` = sum of the group's durations, `rawNames` = the distinct strings seen (usually just one, since this groups by exact string — variant spellings are handled later at the matching step, not here).

### Step 4 — Split dual/group names
Before matching, test each merged name against these patterns (case-insensitive), in this order, and split into two candidate entries if matched:
- ` & ` (e.g. "JOSEPH & EMILY")
- ` and ` (e.g. "Rebecca San and Nodingpar")
- `/` or `+` as a separator between two name-like tokens

Each half inherits the parent's `joinTime`/`leaveTime`/`durationMinutes` and gets `splitFrom` set to the original joint string, and both go on to matching independently. Don't split on commas — that pattern doesn't appear in the sample data and commas are more likely to be part of a single name.

### Step 5 — Flag parenthetical names
Pattern: `Name (Other Name)` (e.g. "Rhai Sueng (Van Ro Sun)", "Johnni (Johnny pa)"). Do **not** auto-resolve these even if one side matches confidently — always route to `reviewQueue` with `reason: "parenthetical_ambiguous"`, `parentheticalAlt` set to the bracketed portion, and run fuzzy matching against **both** the primary and bracketed strings to populate `suggestedMatches` with candidates from either. The admin makes the final call — this pattern is genuinely ambiguous (nickname clarification vs. a shared device with two different real attendees).

### Step 6 — Flag device/telephone names
Heuristic checks (any one is enough to flag): contains a digit adjacent to letters in a model-number-like pattern (e.g. `SM-A525F`), or contains a known device brand keyword (`iPhone`, `Samsung`, `Galaxy`, `Redmi`, `Xiaomi`, `Oppo`, `Vivo`, `Huawei`, `Realme`, `Nokia`, `Tecno`, `Infinix`). Route to `reviewQueue` with `reason: "device_name"`. Still run fuzzy matching in case this exact device string has been linked to a student before (it'll be in that student's `aliases` from a past resolution) — only show as unresolved if there's no existing alias match.

### Step 7 — Fuzzy match everything else
Apply the matching logic from Section 2 to all remaining entries (dual-name halves included). Auto-match high-confidence hits straight into `attendanceRecords`; everything else lands in `reviewQueue` per the thresholds above.

### Step 8 — Review queue resolution (admin, in the UI)
For each `reviewQueue` entry, the admin picks one of:
- **Link to existing student** → creates the `attendanceRecords` row with `matchMethod: "manual"`, and appends the raw name to that student's `aliases` (so it auto-matches next time).
- **Create new student (pending)** → creates a `people` row with `approvalStatus: "pending"`, `registrationSource: "admin"`, links the attendance record to it.
- **Mark as guest** → creates a lightweight `people` row with `role: "guest"` (skips the full profile — guests don't need camp/location/Duolingo fields) and links attendance.
- **Ignore** → no `attendanceRecords` row is created; the queue entry is marked `resolution: "ignored"` and kept (not deleted) for audit history.

### Step 9 — Finalize session
Once the queue for a session has zero unresolved entries, flip `classSessions.status` to `"finalized"`.

## 4. Age Calculation

Never store age — compute it on read from `birthdate`:

```ts
function formatAge(birthdate: string, asOf = new Date()): string | null {
  if (!birthdate) return null;
  const bd = new Date(birthdate);
  let years = asOf.getFullYear() - bd.getFullYear();
  let months = asOf.getMonth() - bd.getMonth();
  if (asOf.getDate() < bd.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  return `${years} years, ${months} months`;
}
```

Use this in both the admin student list/detail view and anywhere age is reported.

## 5. Screens

### Public (no login)
- **`/register`** — self-registration form. Fields: name (required), Chin name (optional, Hakha Chin/Lai, Latin script — see Section 8), English nickname (optional, unique — see Section 9), email (optional), camp (optional), location — town/region/country (optional), birthdate (optional, plain date picker), ambition (optional), school (optional), interests (optional free text). On submit: create `people` row, `role: "student"`, `approvalStatus: "pending"`, `registrationSource: "self"`. Show a friendly confirmation, not a data dump — this is a low-bandwidth, phone-first form for kids, so keep it short and avoid heavy assets/frameworks-within-frameworks.

### Admin (behind login)
- **`/admin`** — dashboard: count of pending registrations, count of sessions needing review, recent sessions.
- **`/admin/pending`** — approval queue for self-registered people: approve / edit-then-approve / reject.
- **`/admin/people`** — searchable/filterable directory (by role, camp, approval status); click through to a detail view per person showing profile fields, computed age, attendance history, and Duolingo history (simple table + line chart of level over time).
- **`/admin/people/:id`** — edit any field, change role, add a Duolingo entry (level + test date), add admin notes.
- **`/admin/import`** — upload a Zoom CSV, see the pipeline run (Steps 1–7 above happen here), then land on...
- **`/admin/import/:sessionId/review`** — the review queue UI: one card per unresolved entry, showing the raw name, the reason it was flagged, and up to 3 suggested matches with scores, plus the four resolution actions from Step 8. Session shows as "finalized" once empty.
- **`/admin/sessions`** — list of past sessions with date, attendance count, and status; click through to see the finalized attendance list per session.
- **`/admin/export`** — CSV export of attendance and/or the people directory, for reporting purposes.

## 6. Build Phases

Suggested order, each shippable on its own:

1. **Foundation** — Convex project wired up with `schema.ts`, Convex Auth for admins, `adminUsers` seeded manually (Bret + community leader).
2. **Registration + approval** — `/register` public form, `/admin/pending` approval queue, `/admin/people` directory (read/edit).
3. **CSV import + matching pipeline** — Steps 1–7 as a Convex action, `/admin/import` upload UI.
4. **Review queue** — `/admin/import/:sessionId/review` UI and the four resolution mutations (Step 8), session finalization (Step 9).
5. **Duolingo + progress views** — history entries, per-student chart, attendance history view.
6. **Export + polish** — `/admin/export`, mobile pass on `/register`, embed snippet handed to whoever maintains 25bridges.org.

## 8. Bilingual Labels & Hints (Registration Form)

Language choice: **Hakha Chin (Lai / Laiholh)** — per Bret, this is the most common Chin dialect for this population and functions as a lingua franca across Chin communities (Ethnologue code `cnh`, ~300,000 speakers). Unlike Myanmar/Burmese, Chin languages use the **Latin-based Hakha alphabet**, so no special Unicode font handling is needed — plain Latin text input and rendering work fine.

Every field on `/register` needs an English label, a Hakha Chin translation, and a short hint — shown together, not behind a language toggle, so a beginner never has to switch views to understand a field. Suggested layout per field: English label, Hakha Chin translation directly beneath it in a visually distinct (but not smaller/lower-priority) style, then a one-line hint/example under both.

Store these as a translations lookup (e.g. `labels.ts` — plain English key → `{ en, cnh, hint_en, hint_cnh }`), not hardcoded into the JSX, so wording can be fixed without touching component logic.

**Confidence key:** ✅ = confirmed against a published Hakha Chin dictionary (chin-dictionary.com, Glosbe `cnh`). ⚠️ = placeholder, not yet verified — **do not ship these without a native speaker (ideally the community leader) checking them.** Getting this list confirmed is a five-minute conversation for a Hakha Chin speaker and meaningfully lowers the risk of putting a wrong or nonsensical word in front of a beginner.

| Field | English | Hakha Chin (Lai) | Status | Hint (English) |
|---|---|---|---|---|
| Name | Name | Min | ✅ | Your full name |
| Chin name | Your name in Chin | Na min (Laiholh in) | ⚠️ | Write it the way you'd spell it in Chin |
| English nickname | English nickname (optional) | Min dang (Mirang holh) | ⚠️ | A short name your teachers can call you — must be different from everyone else's |
| Email | Email (optional) | Email | ⚠️ (likely a direct loanword) | Only if you have one |
| Camp | Camp (optional) | Camp | ⚠️ (likely a direct loanword) | The camp you live in, if any |
| Town / Region / Country | Town / Region / Country | — | ⚠️ (no dictionary entry found) | Where you live now |
| Birthdate | Date of birth (optional) | Na chuah ni | ⚠️ (built from "chuah" = to be born + "ni" = day, seen together in the dictionary's own example sentence for "birthday" — worth a native-speaker check on word order) | If you know it |
| Ambition | What do you want to be? (optional) | — | ⚠️ (no dictionary entry found) | Your dream job or goal |
| School | School (optional) | Sianginn | ✅ | Name of your school, if you go to one |
| Interests | Other interests (optional) | — | ⚠️ (no dictionary entry found) | Things you enjoy — sport, music, art... |
| Submit button | Submit | — | ⚠️ (no dictionary entry found) | — |

Sources checked: [chin-dictionary.com](https://chin-dictionary.com/phrases-englishhakha/) (English/Hakha phrase list, includes "Today is my birthday: Nihin cu ka chuah cam a si") and [Glosbe English–Hakha Chin dictionary](https://glosbe.com/en/cnh). Several common form-type words (country, town, ambition, interests, submit) simply don't have entries in either free online dictionary — that's a real gap, not something worth guessing around. Fastest fix: read this table to the community leader or a Hakha-speaking teacher once and fill in the ⚠️ rows — cheaper and safer than shipping unverified translations to a form kids fill in themselves.

## 9. Nickname Uniqueness

`nickname` is optional, but when set it must be unique across the **entire** `people` table (students, teachers, aides, guests all share one namespace — two people can't both be "Chris" regardless of role).

Implementation:
1. On every write to `nickname` (registration or admin edit), lowercase + trim it into `nicknameLower` in the same mutation — never trust the client to send `nicknameLower` directly.
2. **Live check (UX):** as the student types, debounce (~400ms) a query against `people.by_nicknameLower` for an exact match. If found, show "That nickname is already taken — try another" inline, before they even submit.
3. **Server-side enforcement (correctness):** the live check alone isn't race-safe — two people could submit within the same debounce window. The create/update mutation must re-run the same `by_nicknameLower` lookup itself, inside the transaction, and reject the write if a match exists (excluding the record being edited, for updates). Convex mutations are transactional, so this check-then-write is atomic and this is the actual guarantee — the live check is only there to save the user a failed submit.
4. Empty/absent nicknames never collide with each other — only run the uniqueness check when `nickname` is non-empty.

## 10. Things Not To Guess On

- Never auto-link an attendance record to a student below the 0.90 exact/fuzzy threshold — route to review instead, per the PRD's non-functional requirement that misattributed attendance never happens silently.
- Never surface one student's data to another via the public form — it's write-only from the public side.
- Keep the admin allowlist (`adminUsers`) and the host-email allowlist (Section 3, Step 2) as data, not hardcoded strings, so Bret can add a second admin or teacher without a code change.
- Never enforce nickname uniqueness with only a client-side check — the server-side re-check in Section 9 is the real guarantee.
