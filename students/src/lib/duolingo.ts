// Maps a Duolingo English Test score (0-160) to a CEFR level, for
// streaming students into classes. Never stored — computed from the raw
// score at display time, same pattern as age from birthdate.
export function scoreToLevel(score: number): string {
  if (score <= 29) return "A1";
  if (score <= 59) return "A2";
  if (score <= 99) return "B1";
  if (score <= 129) return "B2";
  if (score <= 154) return "C1";
  return "C2";
}
