interface AttendanceRow {
  _id: string;
  sessionDate: string;
  durationMinutes: number;
  matchMethod: string;
}

// Pure display — no data-fetching, no mutations. Shared by the admin
// AttendanceHistorySection and the portal's PortalAttendanceSection, which
// each fetch their own records via their own (differently-gated) query.
export default function AttendanceHistoryView({ records }: { records: AttendanceRow[] }) {
  if (records.length === 0) {
    return <p className="text-secondary">No attendance recorded yet.</p>;
  }
  return (
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
  );
}
