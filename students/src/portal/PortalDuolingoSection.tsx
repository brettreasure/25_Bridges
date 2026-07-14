import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { scoreToLevel } from "../lib/duolingo";
import DuolingoHistoryView from "../components/DuolingoHistoryView";

export default function PortalDuolingoSection({ personId }: { personId: Id<"people"> }) {
  const entries = useQuery(api.portal.myDuolingoHistory, { personId });
  const addEntry = useMutation(api.portal.myAddDuolingoEntry);

  const [score, setScore] = useState("");
  const [testDate, setTestDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scoreNumber = score === "" ? null : Number(score);
  const previewLevel =
    scoreNumber !== null && Number.isInteger(scoreNumber) && scoreNumber >= 0 && scoreNumber <= 160
      ? scoreToLevel(scoreNumber)
      : null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (scoreNumber === null || !Number.isInteger(scoreNumber) || scoreNumber < 0 || scoreNumber > 160) {
      setError("Score must be a whole number from 0 to 160.");
      return;
    }
    setSubmitting(true);
    try {
      await addEntry({ personId, score: scoreNumber, testDate });
      setScore("");
      setTestDate("");
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Could not add entry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ textAlign: "left" }}>
      <h2>Duolingo history</h2>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "1rem" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Score</label>
          <input
            className="input"
            type="number"
            min={0}
            max={160}
            step={1}
            style={{ width: 90 }}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
          />
        </div>
        {previewLevel && <div className="tag">{previewLevel}</div>}
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Month</label>
          <input
            className="input"
            type="month"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-brand" disabled={submitting}>
          Add my score
        </button>
      </form>
      {error && <p className="text-error">{error}</p>}

      {entries === undefined && <p>Loading...</p>}
      {entries && <DuolingoHistoryView entries={entries} />}
    </div>
  );
}
