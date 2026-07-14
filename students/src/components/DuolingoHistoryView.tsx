import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { scoreToLevel } from "../lib/duolingo";

interface DuolingoEntry {
  _id: string;
  testDate: string;
  score: number;
  recordedBy?: string;
}

// Pure display — no data-fetching, no mutations. Shared by the admin
// DuolingoSection and the portal's PortalDuolingoSection, which each have
// their own write form calling their own (differently-gated) mutation,
// then render this for the read-only chart+table.
export default function DuolingoHistoryView({ entries }: { entries: DuolingoEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-secondary">No Duolingo entries yet.</p>;
  }

  const chartData = entries.map((e) => ({ testDate: e.testDate, value: e.score }));

  return (
    <>
      {chartData.length >= 2 && (
        <div style={{ height: 200, maxWidth: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="testDate" />
              <YAxis domain={[0, 160]} />
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
            <th>Score</th>
            <th>Level</th>
            <th>Recorded by</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry._id}>
              <td>{entry.testDate}</td>
              <td>{entry.score}</td>
              <td>{scoreToLevel(entry.score)}</td>
              <td>{entry.recordedBy ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
