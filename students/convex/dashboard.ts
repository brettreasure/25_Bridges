import { query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";

function isWednesday(dateIso: string): boolean {
  return new Date(`${dateIso}T00:00:00`).getDay() === 3;
}

// Per-Wednesday-session student headcount over the trailing 12 months, for
// the dashboard trend chart. Guests/aides/teachers are excluded — only
// role: "student" attendance counts.
export const wednesdayAttendanceTrend = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffIso = cutoff.toISOString().slice(0, 10);

    const sessions = (await ctx.db.query("classSessions").collect())
      .filter((s) => s.date >= cutoffIso && isWednesday(s.date))
      .sort((a, b) => a.date.localeCompare(b.date));

    const people = await ctx.db.query("people").collect();
    const studentIds = new Set(people.filter((p) => p.role === "student").map((p) => p._id));

    const records = await ctx.db.query("attendanceRecords").collect();
    const countBySession = new Map<string, number>();
    for (const r of records) {
      if (!studentIds.has(r.personId)) continue;
      countBySession.set(r.sessionId, (countBySession.get(r.sessionId) ?? 0) + 1);
    }

    return sessions.map((s) => ({ date: s.date, count: countBySession.get(s._id) ?? 0 }));
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
