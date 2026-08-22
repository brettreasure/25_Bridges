import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";

export default function Import() {
  const navigate = useNavigate();
  const importSession = useMutation(api.importSession.importSession);

  const [file, setFile] = useState<File | null>(null);
  const [sessionDate, setSessionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"merge" | "separate" | null>(null);

  const existingSession = useQuery(
    api.importSession.checkExistingSessionForDate,
    sessionDate ? { date: sessionDate } : "skip"
  );

  useEffect(() => {
    setMode(null); // re-ask whenever the chosen date changes
  }, [sessionDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file || !sessionDate) {
      setError("Choose a CSV file and set the session date.");
      return;
    }
    if (existingSession && mode === null) return;
    setSubmitting(true);
    try {
      const csvText = await file.text();
      const result = await importSession({
        sessionDate,
        sourceFileName: file.name,
        csvText,
        mode: mode ?? "separate",
      });
      navigate(`/admin/import/${result.sessionId}/review`);
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Import Zoom attendance</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <div className="field">
          <label>Session date</label>
          <input
            className="input"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Zoom participants CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        {existingSession && mode === null && (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <p style={{ marginTop: 0 }}>There is a pre-existing upload on this date.</p>
            <p>Would you like to merge this upload with the previous one or treat as separate?</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode("merge")}>
                Merge
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode("separate")}>
                Treat as separate
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-error">{error}</p>}
        <button
          type="submit"
          className="btn btn-brand"
          disabled={submitting || (!!existingSession && mode === null)}
        >
          {submitting ? "Importing..." : "Import"}
        </button>
      </form>
    </div>
  );
}
