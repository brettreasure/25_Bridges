// Parsing/normalization helpers for the Zoom participants CSV import.
// See BUILD_SPEC.md section 3 for the step-by-step pipeline these support.

export interface NormalizedRow {
  rawName: string;
  email?: string;
  joinTime: number;
  leaveTime: number;
  durationMinutes: number;
}

export interface Candidate {
  rawName: string;
  splitFrom?: string;
  joinTime: number;
  leaveTime: number;
  durationMinutes: number;
}

// Zoom exports two participant report shapes. The "detailed" one has a
// join/leave timestamp per connection; the "summary" one has already
// collapsed each attendee to a single row with a total duration.
export type CsvFormat = "detailed" | "summary";

export function detectFormat(fields: string[]): CsvFormat | null {
  if (fields.includes("Join time") && fields.includes("Leave time")) return "detailed";
  if (fields.includes("Total duration (minutes)")) return "summary";
  return null;
}

// Zoom's timestamp format: "MM/DD/YYYY hh:mm:ss AM/PM"
export function parseZoomDateTime(raw: string): number {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+(AM|PM)$/i);
  if (!match) {
    throw new Error(`Unrecognized date/time format: "${raw}"`);
  }
  const [, mm, dd, yyyy, hh, min, ss, ampm] = match;
  let hour = parseInt(hh, 10) % 12;
  if (ampm.toUpperCase() === "PM") hour += 12;
  return new Date(
    parseInt(yyyy, 10),
    parseInt(mm, 10) - 1,
    parseInt(dd, 10),
    hour,
    parseInt(min, 10),
    parseInt(ss, 10)
  ).getTime();
}

export function normalizeRows(
  parsedRows: Record<string, string>[],
  format: CsvFormat,
  sessionDateMidnightMs: number
): NormalizedRow[] {
  const rows = parsedRows.filter((r) => r["Name (original name)"]?.trim());

  if (format === "detailed") {
    return rows.map((r) => ({
      rawName: r["Name (original name)"].trim(),
      email: r["Email"]?.trim() || undefined,
      joinTime: parseZoomDateTime(r["Join time"]),
      leaveTime: parseZoomDateTime(r["Leave time"]),
      durationMinutes: parseFloat(r["Duration (minutes)"]) || 0,
    }));
  }

  // Summary format has no real join/leave timestamps — the session date at
  // midnight is used as a documented placeholder, not a guess about actual
  // attendance times. See BUILD_SPEC.md section 3 / the plan's CSV-format note.
  return rows.map((r) => ({
    rawName: r["Name (original name)"].trim(),
    email: r["Email"]?.trim() || undefined,
    joinTime: sessionDateMidnightMs,
    leaveTime: sessionDateMidnightMs,
    durationMinutes: parseFloat(r["Total duration (minutes)"]) || 0,
  }));
}

// Groups by exact raw name string within the session — variant spellings
// are handled later at the matching step, not here.
export function mergeByExactName(rows: NormalizedRow[]): NormalizedRow[] {
  const groups = new Map<string, NormalizedRow[]>();
  for (const row of rows) {
    const group = groups.get(row.rawName);
    if (group) {
      group.push(row);
    } else {
      groups.set(row.rawName, [row]);
    }
  }

  return Array.from(groups.values()).map((group) => ({
    rawName: group[0].rawName,
    email: group.find((g) => g.email)?.email,
    joinTime: Math.min(...group.map((g) => g.joinTime)),
    leaveTime: Math.max(...group.map((g) => g.leaveTime)),
    durationMinutes: group.reduce((sum, g) => sum + g.durationMinutes, 0),
  }));
}

const NAME_TOKEN = /[a-z]/i;

// " & ", " and ", then "/" or "+" — in that order, per BUILD_SPEC.md step 4.
const DUAL_NAME_PATTERNS = [/\s+&\s+/, /\s+and\s+/i, /\s*[/+]\s*/];

// Pure string version, reused both for splitting a raw name directly and
// for checking whether a parenthetical's bracketed portion is itself a
// joint name (e.g. "Eugene Roman & Assumpta" inside "Eugene Roman (Eugene
// Roman & Assumpta)").
export function trySplitJointName(name: string): [string, string] | null {
  for (const pattern of DUAL_NAME_PATTERNS) {
    const parts = name.split(pattern);
    if (parts.length === 2) {
      const [a, b] = parts.map((p) => p.trim());
      if (a && b && NAME_TOKEN.test(a) && NAME_TOKEN.test(b)) {
        return [a, b];
      }
    }
  }
  return null;
}

export function splitDualNames(row: NormalizedRow): Candidate[] {
  const split = trySplitJointName(row.rawName);
  if (split) {
    return split.map((half) => ({
      rawName: half,
      splitFrom: row.rawName,
      joinTime: row.joinTime,
      leaveTime: row.leaveTime,
      durationMinutes: row.durationMinutes,
    }));
  }
  return [
    {
      rawName: row.rawName,
      joinTime: row.joinTime,
      leaveTime: row.leaveTime,
      durationMinutes: row.durationMinutes,
    },
  ];
}

// "Name (Other Name)" — e.g. "Rhai Sueng (Van Ro Sun)".
export function detectParenthetical(name: string): { primary: string; alt: string } | null {
  const match = name.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (!match) return null;
  return { primary: match[1].trim(), alt: match[2].trim() };
}

const DEVICE_BRANDS = [
  "iphone",
  "samsung",
  "galaxy",
  "redmi",
  "xiaomi",
  "oppo",
  "vivo",
  "huawei",
  "realme",
  "nokia",
  "tecno",
  "infinix",
];

export function looksLikeDevice(name: string): boolean {
  const lower = name.toLowerCase();
  if (DEVICE_BRANDS.some((brand) => lower.includes(brand))) return true;
  // A digit adjacent to letters in a model-number-like pattern, e.g. "SM-A525F".
  return /[a-z]{1,4}-?\d{2,5}[a-z]{0,3}\d{0,3}/i.test(name);
}
