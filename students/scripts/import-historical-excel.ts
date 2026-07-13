// One-off historical attendance backfill from a hand-maintained Excel
// workbook. See /Users/brettreasure/.claude/plans/greedy-swinging-quail.md
// for the full plan this implements.
//
// Usage:
//   npx tsx scripts/import-historical-excel.ts --only=2025-02-18   # pilot, dev
//   npx tsx scripts/import-historical-excel.ts                     # all dates, dev
//   npx tsx scripts/import-historical-excel.ts --prod               # all dates, prod
//   npx tsx scripts/import-historical-excel.ts --dry-run            # parse only, no writes

import XLSX from "xlsx";
import { execFileSync } from "node:child_process";

const FILE_PATH = "/Users/brettreasure/Downloads/Final Updated Student Lists.xlsx";
const SOURCE_FILE_NAME = "Final Updated Student Lists.xlsx";

interface TabConfig {
  sheetName: string;
  dateRowIndex: number; // 0-indexed row holding the date headers
  firstDataRowIndex: number; // 0-indexed first row that can hold a person
}

// Confirmed by direct inspection — see the plan doc for how each was found.
const TABS: TabConfig[] = [
  { sheetName: "Class Attendance Collection2025", dateRowIndex: 2, firstDataRowIndex: 3 },
  { sheetName: "Aug-Dec2025 Class Attendance Li", dateRowIndex: 0, firstDataRowIndex: 3 },
  { sheetName: "October2025 -July 2026 Attendan", dateRowIndex: 0, firstDataRowIndex: 4 },
];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseDateCell(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const s = value.trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const [, d, mo, y] = m;
      let year = parseInt(y, 10);
      if (year < 100) year += 2000;
      return new Date(year, parseInt(mo, 10) - 1, parseInt(d, 10));
    }
    m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const [, d, monthName, y] = m;
      const idx = MONTHS.findIndex((mn) => monthName.toLowerCase().startsWith(mn));
      if (idx >= 0) return new Date(parseInt(y, 10), idx, parseInt(d, 10));
    }
  }
  return null;
}

function isPlausibleYear(d: Date): boolean {
  const y = d.getFullYear();
  return y >= 2024 && y <= 2027;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Some native Excel date cells in tab 1 have day/month swapped (a classic
// DD/MM-typed-but-MM/DD-stored locale artifact). If the literal reading
// breaks the ascending sequence its neighbors establish, but swapping
// day/month restores it, use the swap.
function maybeSwapDayMonth(d: Date): Date | null {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  if (day > 12 || month > 12) return null;
  return new Date(d.getFullYear(), day - 1, month);
}

const wb = XLSX.readFile(FILE_PATH, { cellDates: true });

const attendanceByDate = new Map<string, string[]>();

for (const tab of TABS) {
  const sheet = wb.Sheets[tab.sheetName];
  if (!sheet) throw new Error(`Sheet not found: ${tab.sheetName}`);
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const headerRow = rows[tab.dateRowIndex] ?? [];
  const dateColumns: { col: number; date: Date }[] = [];
  for (let col = 2; col < headerRow.length; col++) {
    const parsed = parseDateCell(headerRow[col]);
    if (!parsed || !isPlausibleYear(parsed)) continue;
    dateColumns.push({ col, date: parsed });
  }

  for (let i = 0; i < dateColumns.length; i++) {
    const entry = dateColumns[i];
    const raw = headerRow[entry.col];
    if (!(raw instanceof Date)) continue;
    const prev = dateColumns[i - 1]?.date;
    const next = dateColumns[i + 1]?.date;
    const inOrder = (!prev || entry.date > prev) && (!next || entry.date < next);
    if (inOrder) continue;
    const swapped = maybeSwapDayMonth(entry.date);
    if (!swapped) continue;
    const swappedInOrder = (!prev || swapped > prev) && (!next || swapped < next);
    if (swappedInOrder) {
      console.log(
        `  [swap] ${tab.sheetName} col ${entry.col}: ${entry.date.toDateString()} -> ${swapped.toDateString()}`
      );
      entry.date = swapped;
    }
  }

  console.log(`${tab.sheetName}: ${dateColumns.length} real date columns`);

  for (let r = tab.firstDataRowIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const name = row[1];
    if (typeof name !== "string" || !name.trim()) continue;
    for (const { col, date } of dateColumns) {
      const cell = row[col];
      if (typeof cell === "string" && cell.trim().toUpperCase() === "A") {
        const iso = toIso(date);
        const list = attendanceByDate.get(iso);
        if (list) list.push(name);
        else attendanceByDate.set(iso, [name]);
      }
    }
  }
}

const sortedDates = Array.from(attendanceByDate.keys()).sort();
console.log(`\nTotal unique dates with attendance: ${sortedDates.length}`);

const args = process.argv.slice(2);
const prodFlag = args.includes("--prod");
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlyDate = onlyArg ? onlyArg.split("=")[1] : null;

const datesToRun = onlyDate ? sortedDates.filter((d) => d === onlyDate) : sortedDates;
if (onlyDate && datesToRun.length === 0) {
  console.error(`No data found for date ${onlyDate}`);
  process.exit(1);
}

if (dryRun) {
  for (const date of datesToRun) {
    console.log(`${date}: ${attendanceByDate.get(date)!.length} raw names`);
  }
  process.exit(0);
}

console.log(`Running ${datesToRun.length} date(s) against ${prodFlag ? "PRODUCTION" : "dev"}...`);

for (const date of datesToRun) {
  const rawNames = attendanceByDate.get(date)!;
  const payload = JSON.stringify({ date, sourceFileName: SOURCE_FILE_NAME, rawNames });
  const cliArgs = ["convex", "run", "historicalImport:importDateAttendance", payload];
  if (prodFlag) cliArgs.push("--prod");
  console.log(`\n=== ${date} (${rawNames.length} raw names) ===`);
  const output = execFileSync("npx", cliArgs, { encoding: "utf-8" });
  console.log(output.trim());
}
