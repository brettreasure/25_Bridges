import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function extractNumeric(level: string): number | null {
  const match = level.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

export default function DuolingoSection({ personId }: { personId: Id<"people"> }) {
  const entries = useQuery(api.duolingo.listForPerson, { personId });
  const addEntry = useMutation(api.duolingo.addEntry);

  const [level, setLevel] = useState("");
  const [testDate, setTestDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await addEntry({ personId, level, testDate });
      setLevel("");
      setTestDate("");
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Could not add entry.");
    } finally {
      setSubmitting(false);
    }
  }

  const chartData = (entries ?? [])
    .map((e) => ({ testDate: e.testDate, value: extractNumeric(e.level) }))
    .filter((d): d is { testDate: string; value: number } => d.value !== null);

  return (
    <div style={{ textAlign: "left" }}>
      <h2>Duolingo history</h2>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "1rem" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Level / score</label>
          <input className="input" value={level} onChange={(e) => setLevel(e.target.value)} required />
        </div>
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
          Add entry
        </button>
      </form>
      {error && <p className="text-error">{error}</p>}

      {entries === undefined && <p>Loading...</p>}
      {entries && entries.length === 0 && <p className="text-secondary">No Duolingo entries yet.</p>}
      {entries && entries.length > 0 && (
        <>
          {chartData.length >= 2 && (
            <div style={{ height: 200, maxWidth: 500 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="testDate" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="var(--navy)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <table className="tbl" style={{ maxWidth: 500 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Level</th>
                <th>Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._id}>
                  <td>{entry.testDate}</td>
                  <td>{entry.level}</td>
                  <td>{entry.recordedBy ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
