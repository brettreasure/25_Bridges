// Fuzzy name matching against the approved-people roster.
// See BUILD_SPEC.md section 2.

import { distance } from "fastest-levenshtein";
import type { Doc, Id } from "../_generated/dataModel";

// Stripping one of these is itself a signal the person is a teacher/aide,
// not a student — surfaced to the admin in the review UI (Phase 3), not
// stored on the row.
const HONORIFICS = ["sayama", "saya", "pu", "pi", "pastor", "rev", "dr"];

export function normalizeForMatch(name: string): { normalized: string; honorificStripped: boolean } {
  const collapsed = name.toLowerCase().trim().replace(/\s+/g, " ");
  for (const honorific of HONORIFICS) {
    const pattern = new RegExp(`^${honorific}\\.?\\s+`);
    if (pattern.test(collapsed)) {
      return { normalized: collapsed.replace(pattern, "").trim(), honorificStripped: true };
    }
  }
  return { normalized: collapsed, honorificStripped: false };
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b) / maxLen;
}

export interface MatchCandidate {
  personId: Id<"people">;
  name: string;
  score: number;
}

export interface MatchResult {
  method: "exact" | "fuzzy" | null;
  confidence?: number;
  personId?: Id<"people">;
  suggestions: MatchCandidate[];
}

// Compares against every person.name, person.nickname, and every
// person.aliases entry for all approved people; takes the best score across
// all candidates for that person.
export function matchAgainstPeople(rawName: string, people: Doc<"people">[]): MatchResult {
  const { normalized } = normalizeForMatch(rawName);

  const scored: MatchCandidate[] = people.map((person) => {
    const candidates = [person.name, person.nickname, ...person.aliases].filter(
      (c): c is string => !!c
    );
    let best = 0;
    for (const candidate of candidates) {
      const { normalized: candNorm } = normalizeForMatch(candidate);
      const score = candNorm === normalized ? 1 : similarity(normalized, candNorm);
      if (score > best) best = score;
      if (best === 1) break;
    }
    return { personId: person._id, name: person.name, score: best };
  });

  scored.sort((a, b) => b.score - a.score);
  const suggestions = scored.slice(0, 3);
  const top = suggestions[0];

  if (!top || top.score < 0.9) {
    return { method: null, suggestions };
  }
  return {
    method: top.score === 1 ? "exact" : "fuzzy",
    confidence: top.score,
    personId: top.personId,
    suggestions,
  };
}

// A reviewQueue entry's own suggestedMatches are frozen at import time — if
// a matching person gets created afterward (e.g. resolving the same name in
// a different session), it never shows up there. Re-running the match live
// against the current roster catches that instead of silently risking a
// duplicate person. Shared between the review UI (src/admin/ReviewEntryCard)
// and the server-side bulk-resolve mutation so both agree on what counts as
// a match.
export function liveSuggestionsForEntry(
  entry: Pick<Doc<"reviewQueue">, "rawName" | "parentheticalAlt">,
  people: Doc<"people">[]
): MatchCandidate[] {
  const primaryName = entry.parentheticalAlt
    ? entry.rawName.replace(/\s*\(.+\)\s*$/, "")
    : entry.rawName;
  const primaryMatch = matchAgainstPeople(primaryName, people);
  if (!entry.parentheticalAlt) return primaryMatch.suggestions;

  const altMatch = matchAgainstPeople(entry.parentheticalAlt, people);
  const seen = new Set<string>();
  const deduped: MatchCandidate[] = [];
  for (const m of [...primaryMatch.suggestions, ...altMatch.suggestions].sort((a, b) => b.score - a.score)) {
    if (seen.has(m.personId)) continue;
    seen.add(m.personId);
    deduped.push(m);
    if (deduped.length === 3) break;
  }
  return deduped;
}
