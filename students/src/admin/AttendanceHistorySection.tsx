import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function AttendanceHistorySection({ personId }: { personId: Id<"people"> }) {
  const records = useQuery(api.attendanceRecords.listForPerson, { personId });

  return (
    <div>
      <h2>Attendance history</h2>
      {records === undefined && <p>Loading...</p>}
      {records && records.length === 0 && <p>No attendance recorded yet.</p>}
      {records && records.length > 0 && (
        <>
          <p style={{ color: "#666" }}>
            {records.length} session{records.length === 1 ? "" : "s"} attended.
          </p>
          <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 500 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                <th>Session date</th>
                <th>Duration (min)</th>
                <th>Match method</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id} style={{ borderBottom: "1px solid #eee" }}>
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
