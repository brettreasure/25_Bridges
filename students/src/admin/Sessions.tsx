import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export default function Sessions() {
  const sessions = useQuery(api.classSessions.listSessions, {});

  if (sessions === undefined) return <p>Loading...</p>;

  return (
    <div>
      <h1>Sessions</h1>
      {sessions.length === 0 && <p className="text-secondary">No sessions imported yet.</p>}
      <table className="tbl">
        <thead>
          <tr>
            <th>Date</th>
            <th>Source file</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session._id}>
              <td>{session.date}</td>
              <td>{session.sourceFileName ?? ""}</td>
              <td>
                {session.status === "needs_review" ? (
                  <Link to={`/admin/import/${session._id}/review`} className="btn-link-plain">
                    needs review
                  </Link>
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
