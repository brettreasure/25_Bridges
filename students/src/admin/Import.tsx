import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";

export default function Import() {
  const navigate = useNavigate();
  const importSession = useMutation(api.importSession.importSession);

  const [file, setFile] = useState<File | null>(null);
  const [sessionDate, setSessionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file || !sessionDate) {
      setError("Choose a CSV file and set the session date.");
      return;
    }
    setSubmitting(true);
    try {
      const csvText = await file.text();
      const result = await importSession({
        sessionDate,
        sourceFileName: file.name,
        csvText,
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
        {error && <p className="text-error">{error}</p>}
        <button type="submit" className="btn btn-brand" disabled={submitting}>
          {submitting ? "Importing..." : "Import"}
        </button>
      </form>
    </div>
  );
}
