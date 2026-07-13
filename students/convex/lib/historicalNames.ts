// Name cleaning for the historical Excel attendance import. Distinct from
// convex/lib/csv.ts's Zoom-CSV splitting: these rows can join 2-5 people
// with a mix of "&", "and", and commas, and carry location/role suffixes
// the Zoom exports never had (" - Mizoram", " - Helper", "(PKK)", etc.).

// Strips a trailing " - <words>" location/role tag and any trailing
// "(...)" annotation, leaving just the name portion(s). Stripping one can
// expose another underneath (e.g. "Merry (PKK) - Myanmar" only reveals the
// "(PKK)" once "- Myanmar" is gone), so this repeats until nothing changes.
function stripAnnotations(raw: string): string {
  let s = raw.trim();
  while (true) {
    const next = s.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+-\s+[^-]+$/, "").trim();
    if (next === s) return next;
    s = next;
  }
}

// Splits on commas, "&", and "and" (word-boundary, case-insensitive) into
// individual name tokens — generalizes csv.ts's 2-way trySplitJointName to
// however many names a row joins.
function splitNames(s: string): string[] {
  return s
    .split(/\s*,\s*|\s*&\s*|\s+and\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && /[a-z]/i.test(part));
}

// Split before stripping: a trailing annotation on the *whole* raw string
// only ever attaches to the last name in a joint entry (e.g. the "- Delhi"
// in "Ka Ni (Angku) & Paul Thang - Delhi"), so stripping first would leave
// "(Angku)" stuck on "Ka Ni" — it's not at the end of the full string once
// split off. Stripping each split-out name individually catches it.
export function cleanAndSplitName(raw: string): string[] {
  return splitNames(raw)
    .map((part) => stripAnnotations(part))
    .filter((part) => part.length > 0);
}
