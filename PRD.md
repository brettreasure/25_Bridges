# PRD — 25 Bridges Student Database & Attendance System

_Prepared: 12 July 2026_

## 1. Overview

25 Bridges runs Zoom classes for refugee children and young adults from Myanmar (Mizoram, India area). Every class produces a Zoom "participants" CSV export, which is currently just a raw log — messy, duplicated, and not tied to any real student record. There is no central place that holds who each student is, tracks their Duolingo progress over time, or records attendance history.

This system replaces that gap with three connected pieces: a student/teacher/aide/guest database, a self-registration form the kids fill in themselves on 25Bridges.org, and an attendance import tool that turns a raw Zoom CSV into clean, matched attendance records with a review step for anything the tool can't confidently resolve on its own.

## 2. Goals

- One database of record for everyone involved in the program — students, teachers, aides, and guests — distinguishing role, with student as the default.
- Students can register themselves via a public form on 25Bridges.org, with new entries held for admin approval before they count as real records.
- After each class, Bret (or another admin) can drop in the Zoom CSV and get clean attendance — duplicate join/leave rows merged, dual/group names split, and anything ambiguous flagged for a quick manual decision rather than silently guessed.
- Duolingo level is tracked as a history, not a single field, so progress is visible over time.
- Age is always current: store birthdate once, display "X years, Y months" calculated live.
- Everything is manageable from a browser — no spreadsheet-wrangling, no manual CSV cleanup.

## 3. Non-Goals

- This is not a learning management system or a Duolingo integration — Duolingo scores are entered manually (by student or admin), not pulled via API.
- Not building a full Zoom integration (e.g. auto-fetching CSVs from Zoom's API) in v1 — the workflow is: Bret downloads the CSV from Zoom, uploads it to the tool.
- Not replacing the ESL curriculum content system already in place in the parent folder — this is purely the people/attendance database.

## 4. Users & Roles

| Role | Description | Default? |
|---|---|---|
| Student | A child/young adult attending classes. | Yes — every self-registration defaults to this unless an admin changes it. |
| Teacher | Runs or co-runs classes (e.g. Bret, other volunteer teachers). | No |
| Aide | Helps in class but isn't the lead teacher (e.g. community leader supporting a session). | No |
| Guest | One-off visitor, observer, or family member who joined a session but isn't part of the program. | No |
| Admin (system role, not a person-record role) | Can approve pending registrations, edit any record, resolve the attendance review queue, manage Duolingo entries, export reports. | — |

A person's **role** (student/teacher/aide/guest) is a property of their record. **Admin** is a separate system permission for who can log into the management side of the tool — an admin doesn't need to be a "teacher" record and vice versa, though in practice they'll usually be the same handful of people (Bret and the community leader who commissioned the program).

## 5. Core Workflows

### 5.1 Student self-registration
A student (or a parent/relative helping them) fills in a public form on 25Bridges.org. Required fields are kept minimal given some students have no internet access at home and may fill this in from a shared phone during class. On submit, the record is created with `approvalStatus: pending` and `role: student`. It does not appear in attendance matching or public listings until an admin approves it. The admin gets a simple "pending" queue to review new sign-ups (checking for obvious duplicates — e.g. someone re-submitting because they forgot they'd already registered).

The form is bilingual: every field label and hint appears in English and in Hakha Chin (Lai) — the most widely spoken and understood Chin language, used as a common language across different Chin communities — so a beginner can fill it in without needing to read English first. The name field accepts a Chin name written in the Latin-based Hakha alphabet as a separate, optional field alongside their regular name.

If a student sets an optional English nickname, it's checked for uniqueness against every other person in the database (case-insensitive) before the form will submit — so two kids can't both end up registered as "Chris." The check runs live as they type and is enforced again on submit, so there's no way for two near-simultaneous submissions to slip through with the same nickname.

**Note on translation accuracy:** a handful of the Hakha Chin field labels below are confirmed against published Hakha Chin dictionaries (e.g. "name" → "min," "school" → "sianginn"); several others are placeholders pending a native speaker's confirmation. See `BUILD_SPEC.md` Section 8 for exactly which is which — don't ship the placeholder ones without a native speaker (ideally the community leader) checking them first.

### 5.2 Post-class attendance import
1. Admin uploads the Zoom participants CSV for a session.
2. The system parses it, merges repeat join/leave rows for the same raw name into a single attendance entry per person per session, and splits obvious dual/group names (e.g. "JOSEPH & EMILY") into two entries.
3. Each resulting name is matched against the student database (fuzzy match on name + any known alias/variant), with matches above a high-confidence threshold auto-linked.
4. Anything not confidently matched — phone/device names like "Samsung SM-A525F", ambiguous entries like "Rhai Sueng (Van Ro Sun)", genuinely new names, or low-confidence matches — is dropped into a **review queue**.
5. Admin works through the review queue in one screen: for each flagged entry, link to an existing student, create a new (pending) student record, mark as a one-off guest, or ignore (e.g. a stray test device with no real attendee behind it).
6. Once resolved, the session's attendance is final and contributes to each student's attendance history. The raw name variant is saved against the matched student so the same device/nickname auto-matches next time.

### 5.3 Admin management
Admin can browse/search all records by role, camp, or location; edit any field; change role or approval status; add a dated Duolingo entry; view a student's attendance history and Duolingo progress over time; and export data (e.g. CSV) for reporting back to whoever oversees the program.

### 5.4 Progress & reporting
For any student: attendance count/rate over a date range, Duolingo level history as a simple timeline, and current age (auto-calculated). These views exist so Bret can report progress to the program's stakeholders without manually cross-referencing spreadsheets.

## 6. Data Requirements

**Every person record** (default role: student):
- Name (required)
- Chin name (optional — entered in Hakha Chin/Lai, using the Latin-based Hakha alphabet)
- English nickname (optional — must be unique across the whole database; checked live in the form and enforced again on submit)
- Known name variants/aliases (system-managed — grows automatically as the CSV importer learns nicknames, device names, etc. actually belonging to this person; the English nickname is included as a match candidate too)
- Role: student / teacher / aide / guest (default student)
- Approval status: pending / approved / rejected
- Email (optional — mainly relevant for teachers/aides)
- Camp (optional free text — not everyone is camp-based)
- Location: town, region, country (optional, any or all)
- Birthdate (optional — not all students will know/share an exact date)
- Ambition (optional)
- School (optional)
- Other interests (optional, free text)
- Registration source: self-registered vs. admin-added
- Notes (admin-only free text)

**Duolingo tracking:** not a single field — a running history of `{ level, testDate, recordedBy }` entries per student, so progress over time is visible rather than overwritten.

**Attendance:** per class session, per student: matched status, join/leave-derived duration, raw name(s) the match was built from, and confidence/method (exact, fuzzy, manual) for auditability.

**Class session:** date, the raw CSV filename/source, who imported it, and when.

## 7. Non-Functional Requirements

- **Safeguarding & privacy:** this database holds personal data on minors in a vulnerable population (refugee children). No public-facing page should list or expose student details — the registration form only ever writes data, it doesn't display other students' records back. Admin access must be gated (login required), not just a hidden URL.
- **Low-bandwidth friendly:** many students may access the registration form on a shared phone with limited data — keep the form lightweight, no heavy assets.
- **Mobile-first:** both the registration form and, ideally, the admin view should work comfortably on a phone screen.
- **Bilingual & beginner-friendly:** every registration field needs an English label, a Hakha Chin translation, and a short hint/example — this is for beginners filling the form themselves, not just a nice-to-have.
- **Resilience of matching:** the importer should never silently misassign attendance to the wrong person — anything below a clear confidence threshold must go to human review rather than being auto-guessed.
- **Auditability:** every attendance record should be traceable back to the raw CSV row(s) it came from, and every manual match/resolution should record who made the call and when.

## 8. Known Data Quirks (from the current Zoom export)

These directly shape the import/matching logic and are documented here so they aren't rediscovered from scratch later:

- **Repeat join/leave rows** — connection drops mean the same person appears multiple times per session (seen up to 3+ times for one name in a single ~70-minute class). Must collapse to one attendance record per person per session.
- **Dual/group names** — e.g. "JOSEPH & EMILY", "Rebecca San and Nodingpar" — almost certainly two people sharing one device/Zoom login. Should split into two attendance entries, each flagged as "split from a joint entry" for the admin to confirm.
- **Parenthetical alt names** — e.g. "Rhai Sueng (Van Ro Sun)", "Johnni (Johnny pa)". Ambiguous by nature (could be a nickname clarification, or the device owner's name in brackets while someone else is actually attending) — always route to manual review rather than auto-resolving.
- **Phone/device names** — e.g. "Samsung SM-A525F" — no identity information at all. Flag as an unidentified device rather than attempting a name match; once an admin links a specific device name to a student once, remember it as an alias for next time.
- **Host/admin rows** — the Zoom host account appears under more than one display name against the same email (e.g. "25 Bridges" and "#Sayama Christalin" both under `info.chai22@gmail.com`). Rows matching a known admin/teacher email should be classified as teacher attendance, not routed through student matching.
- **Honorific prefixes** — names like "Sayama Christalin" or "Saya Bobby" use Chin/Burmese honorifics ("Sayama"/"Saya" ≈ "teacher"). These are a strong signal the person is a teacher or aide, not a student, and should bias role suggestions accordingly.

## 9. Open Questions / Assumptions

- Assuming a small, known set of admins (Bret + the community leader, possibly one or two others) rather than open admin self-signup — admin accounts are provisioned manually, not via public registration.
- Assuming birthdate will often be unknown or approximate for some students; the system should tolerate a blank birthdate (age simply won't display) rather than requiring it.
- Assuming "camp" is not universal — some students may not be camp-based — so it stays optional.
- Reporting/export requirements to the program's funders or partners aren't fully specified yet; v1 ships a general CSV export and can be refined once an actual report format is requested.

## 10. Success Criteria

- Bret can go from a downloaded Zoom CSV to fully resolved, matched attendance in a few minutes, touching only the entries that genuinely need a human decision.
- No attendance is ever attached to the wrong student without a human confirming it.
- A student's Duolingo progress and attendance history can be pulled up and understood at a glance.
- Kids can register themselves without help from Bret, and junk/duplicate self-registrations don't pollute the database because of the approval step.
