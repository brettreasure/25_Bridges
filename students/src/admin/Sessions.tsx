import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export default function Sessions() {
  const sessions = useQuery(api.classSessions.listSessions, {});

  if (sessions === undefined) return <p>Loading...</p>;

  return (
    <div>
      <h1>Sessions</h1>
      {sessions.length === 0 && <p>No sessions imported yet.</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Date</th>
            <th>Source file</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session._id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{session.date}</td>
              <td>{session.sourceFileName ?? ""}</td>
              <td>
                {session.status === "needs_review" ? (
                  <Link to={`/admin/import/${session._id}/review`}>needs review</Link>
                ) : (
                  session.status
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
