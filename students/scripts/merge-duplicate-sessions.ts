// One-off cleanup: merges classSessions rows that share a date, created
// historically as separate, unlinked imports. See
// /Users/brettreasure/.claude/plans/greedy-swinging-quail.md for the plan.
//
// Usage:
//   npx tsx scripts/merge-duplicate-sessions.ts --dry-run           # report only, no writes
//   npx tsx scripts/merge-duplicate-sessions.ts                     # merge all, dev
//   npx tsx scripts/merge-duplicate-sessions.ts --only=2025-09-03   # merge one date
//   npx tsx scripts/merge-duplicate-sessions.ts --prod              # target prod

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const prodFlag = args.includes("--prod");
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlyDate = onlyArg ? onlyArg.split("=")[1] : null;

function runConvex(fn: string, payload: unknown): string {
  const cliArgs = ["convex", "run", fn, JSON.stringify(payload)];
  if (prodFlag) cliArgs.push("--prod");
  return execFileSync("npx", cliArgs, { encoding: "utf-8" }).trim();
}

const dupes: { date: string; count: number }[] = JSON.parse(
  runConvex("mergeDuplicateSessions:findDuplicateDates", {})
);
const targets = onlyDate ? dupes.filter((d) => d.date === onlyDate) : dupes;

console.log(`${targets.length} date(s) with duplicate classSessions rows:`);
for (const d of targets) console.log(`  ${d.date}: ${d.count} sessions`);

if (dryRun) process.exit(0);

console.log(`\nMerging against ${prodFlag ? "PRODUCTION" : "dev"}...`);

for (const d of targets) {
  console.log(`\n=== merging ${d.date} ===`);
  console.log(runConvex("mergeDuplicateSessions:mergeSessionsForDate", { date: d.date }));
}
