import { query, type QueryCtx } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import type { Id } from "./_generated/dataModel";

function dayOfWeek(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00`).getDay();
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// One entry per Monday-start week over the trailing 12 months, for a
// given offset from that week's Monday (2 = Wednesday, 5 = Saturday) —
// not just the sessions that happen to exist. This is what makes the
// Wednesday and Saturday charts share an identical X-axis: both have
// exactly the same number of week-slots, so bars are the same width,
// even though the Saturday side is mostly zero until Saturday classes
// started being tracked. Guests/aides/teachers are excluded — only
// role: "student" attendance counts.
async function attendanceTrendForWeekday(ctx: QueryCtx, dayOffsetFromMonday: number) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const todayIso = new Date().toISOString().slice(0, 10);

  const targetDates: string[] = [];
  let cursor = addDays(mondayOfWeek(cutoffIso), dayOffsetFromMonday);
  while (cursor <= todayIso) {
    targetDates.push(cursor);
    cursor = addDays(cursor, 7);
  }

  const people = await ctx.db.query("people").collect();
  const studentIds = new Set(people.filter((p) => p.role === "student").map((p) => p._id));

  const records = await ctx.db.query("attendanceRecords").collect();
  const countBySession = new Map<string, number>();
  for (const r of records) {
    if (!studentIds.has(r.personId)) continue;
    countBySession.set(r.sessionId, (countBySession.get(r.sessionId) ?? 0) + 1);
  }

  // Sum by date rather than trust one classSession per date — defensive
  // against any not-yet-merged duplicate-date sessions.
  const sessions = await ctx.db.query("classSessions").collect();
  const countByDate = new Map<string, number>();
  for (const s of sessions) {
    const c = countBySession.get(s._id) ?? 0;
    countByDate.set(s.date, (countByDate.get(s.date) ?? 0) + c);
  }

  return targetDates.map((date) => ({ date, count: countByDate.get(date) ?? 0 }));
}

export const wednesdayAttendanceTrend = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return attendanceTrendForWeekday(ctx, 2);
  },
});

export const saturdayAttendanceTrend = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return attendanceTrendForWeekday(ctx, 5);
  },
});

// What share of students who have ever attended (any session, any weekday)
// only ever showed up once — a one-time-visit / churn signal.
export const oneTimeAttendanceRate = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const people = await ctx.db.query("people").collect();
    const studentIds = new Set(people.filter((p) => p.role === "student").map((p) => p._id));

    const records = await ctx.db.query("attendanceRecords").collect();
    const sessionsByStudent = new Map<string, Set<string>>();
    for (const r of records) {
      if (!studentIds.has(r.personId)) continue;
      const sessions = sessionsByStudent.get(r.personId) ?? new Set<string>();
      sessions.add(r.sessionId);
      sessionsByStudent.set(r.personId, sessions);
    }

    const totalAttendingStudents = sessionsByStudent.size;
    const oneTimeStudents = [...sessionsByStudent.values()].filter((s) => s.size === 1).length;
    const percentage = totalAttendingStudents === 0 ? 0 : (oneTimeStudents / totalAttendingStudents) * 100;

    return { totalAttendingStudents, oneTimeStudents, percentage };
  },
});

function isWedOrSat(dateIso: string): boolean {
  const day = dayOfWeek(dateIso);
  return day === 3 || day === 6;
}

// Monday-start week key for a date, expressed as that week's Monday date
// (ISO). No week utility exists elsewhere in the repo — written fresh.
function mondayOfWeek(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const diffFromMonday = (d.getDay() + 6) % 7; // Sun(0)->6, Mon(1)->0, ... Sat(6)->5
  d.setDate(d.getDate() - diffFromMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Top students by CURRENT (ongoing) streak of consecutive Monday-start
// weeks with at least one Wednesday-or-Saturday session attended. A week
// with no Wed/Sat session held at all (e.g. a holiday break) is simply
// never in `opportunityWeeks`, so it doesn't break a streak — only a
// held-but-unattended week does. "Most recent" is anchored to the latest
// imported qualifying session, not to today's calendar date, consistent
// with the rest of this app (nothing else here is computed relative to
// live wall-clock time — everything is import-driven).
export const topAttendanceStreaks = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const qualifyingSessions = (await ctx.db.query("classSessions").collect()).filter((s) =>
      isWedOrSat(s.date)
    );
    if (qualifyingSessions.length === 0) return [];

    const opportunityWeeks = Array.from(new Set(qualifyingSessions.map((s) => mondayOfWeek(s.date)))).sort();
    const sessionWeek = new Map(qualifyingSessions.map((s) => [s._id, mondayOfWeek(s.date)]));

    const people = await ctx.db.query("people").collect();
    const students = people.filter((p) => p.role === "student");
    const studentIds = new Set(students.map((p) => p._id));

    const records = await ctx.db.query("attendanceRecords").collect();
    const attendedWeeksByStudent = new Map<Id<"people">, Set<string>>();
    for (const r of records) {
      if (!studentIds.has(r.personId)) continue;
      const week = sessionWeek.get(r.sessionId);
      if (!week) continue; // attendance at a non-Wed/Sat session doesn't count here
      const set = attendedWeeksByStudent.get(r.personId) ?? new Set<string>();
      set.add(week);
      attendedWeeksByStudent.set(r.personId, set);
    }

    const results = students.map((student) => {
      const attended = attendedWeeksByStudent.get(student._id) ?? new Set<string>();
      let streak = 0;
      for (let i = opportunityWeeks.length - 1; i >= 0; i--) {
        if (attended.has(opportunityWeeks[i])) {
          streak++;
        } else {
          break;
        }
      }
      return { personId: student._id, name: student.name, streak };
    });

    const sorted = results
      .filter((r) => r.streak > 0)
      .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));

    if (sorted.length <= 6) return sorted;
    const cutoffStreak = sorted[5].streak;
    return sorted.filter((r) => r.streak >= cutoffStreak);
  },
});
