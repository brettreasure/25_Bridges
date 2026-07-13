import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function AttendanceHistorySection({ personId }: { personId: Id<"people"> }) {
  const records = useQuery(api.attendanceRecords.listForPerson, { personId });

  return (
    <div style={{ textAlign: "left" }}>
      <h2>Attendance history</h2>
      {records === undefined && <p>Loading...</p>}
      {records && records.length === 0 && <p className="text-secondary">No attendance recorded yet.</p>}
      {records && records.length > 0 && (
        <>
          <p className="text-secondary" style={{ marginBottom: "0.5rem" }}>
            {records.length} session{records.length === 1 ? "" : "s"} attended.
          </p>
          <table className="tbl" style={{ maxWidth: 500 }}>
            <thead>
              <tr>
                <th>Session date</th>
                <th>Duration (min)</th>
                <th>Match method</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id}>
                  <td>{record.sessionDate}</td>
                  <td>{record.durationMinutes}</td>
                  <td>{record.matchMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
