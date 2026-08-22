// Merges multiple attendanceRecords-shaped rows for the SAME person —
// whether from the same classSession (a rejoin) or two different
// classSessions being consolidated — into one. Generalizes the
// within-session merge already done by mergeByExactName (lib/csv.ts) and
// the per-person merge in historicalImport.ts to also work across
// sessions, for mergeDuplicateSessions.ts and importSession.ts's "merge
// into an existing session" mode.

export interface AttendanceRecordLike {
  rawNames: string[];
  joinTime: number;
  leaveTime: number;
  durationMinutes: number;
  matchMethod: "exact" | "fuzzy" | "manual" | "host_email";
  matchConfidence?: number;
  resolvedBy?: string;
  resolvedAt?: number;
}

// An admin's manual resolution is the most authoritative signal and
// should never be silently downgraded by a fuzzy/exact match from the
// other session; exact/host_email are both deterministic string matches
// so they're treated as equally authoritative, ahead of fuzzy.
const METHOD_RANK: Record<AttendanceRecordLike["matchMethod"], number> = {
  manual: 3,
  exact: 2,
  host_email: 2,
  fuzzy: 1,
};

export function mergeAttendanceGroup(group: AttendanceRecordLike[]): AttendanceRecordLike {
  const rawNames = Array.from(new Set(group.flatMap((g) => g.rawNames)));
  const joinTime = Math.min(...group.map((g) => g.joinTime));
  const leaveTime = Math.max(...group.map((g) => g.leaveTime));
  const durationMinutes = group.reduce((sum, g) => sum + g.durationMinutes, 0);

  const bestRank = Math.max(...group.map((g) => METHOD_RANK[g.matchMethod]));
  const winners = group.filter((g) => METHOD_RANK[g.matchMethod] === bestRank);
  const matchMethod = winners[0].matchMethod;
  const matchConfidence =
    matchMethod === "fuzzy" ? Math.max(...winners.map((g) => g.matchConfidence ?? 0)) : undefined;

  // Most recent manual resolution's audit trail wins, if any exists.
  const resolved = group
    .filter((g) => g.resolvedAt !== undefined)
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))[0];

  return {
    rawNames,
    joinTime,
    leaveTime,
    durationMinutes,
    matchMethod,
    matchConfidence,
    resolvedBy: resolved?.resolvedBy,
    resolvedAt: resolved?.resolvedAt,
  };
}
