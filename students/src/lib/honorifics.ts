// "Saya"/"Sayama" are the honorifics this program uses for teachers/aides —
// spotting one in a raw Zoom name is itself a signal the person isn't a
// student, and the honorific shouldn't end up as part of their stored name.
const TEACHER_HONORIFICS = ["sayama", "saya"];

export function detectHonorific(rawName: string): { suggestedName: string; isLikelyTeacher: boolean } {
  // Some attendees prefixed/suffixed their Zoom display name with a stray
  // "#" (seen across the real CSVs) — strip that regardless of honorific.
  const cleaned = rawName.trim().replace(/^#+\s*/, "").replace(/\s*#+$/, "").trim();

  for (const honorific of TEACHER_HONORIFICS) {
    const pattern = new RegExp(`^${honorific}\\.?\\s+`, "i");
    if (pattern.test(cleaned)) {
      return { suggestedName: cleaned.replace(pattern, "").trim(), isLikelyTeacher: true };
    }
  }
  return { suggestedName: cleaned, isLikelyTeacher: false };
}
