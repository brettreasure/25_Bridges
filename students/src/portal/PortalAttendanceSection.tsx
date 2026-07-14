import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import AttendanceHistoryView from "../components/AttendanceHistoryView";

// Read-only, no form — attendance is a fact about what happened
// (Zoom/import-derived), not self-reported data.
export default function PortalAttendanceSection({ personId }: { personId: Id<"people"> }) {
  const records = useQuery(api.portal.myAttendanceHistory, { personId });

  return (
    <div style={{ textAlign: "left" }}>
      <h2>Attendance history</h2>
      {records === undefined && <p>Loading...</p>}
      {records && <AttendanceHistoryView records={records} />}
    </div>
  );
}
