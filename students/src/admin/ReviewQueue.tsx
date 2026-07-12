import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ReviewEntryCard from "./ReviewEntryCard";

export default function ReviewQueue() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = sessionId as Id<"classSessions">;

  const detail = useQuery(api.classSessions.getSessionDetail, { id });
  const reviewEntries = useQuery(api.reviewQueue.listForSession, { sessionId: id });
  const attendance = useQuery(api.attendanceRecords.listForSession, { sessionId: id });
  const allPeople = useQuery(api.people.listAll, {});

  if (
    detail === undefined ||
    reviewEntries === undefined ||
    attendance === undefined ||
    allPeople === undefined
  ) {
    return <p>Loading...</p>;
  }
  if (detail === null) return <p>Session not found.</p>;

  const unresolved = reviewEntries.filter((e) => !e.resolution);
  const resolved = reviewEntries.filter((e) => e.resolution);

  return (
    <div>
      <h1>Session {detail.session.date}</h1>
      <p>
        Status: {detail.session.status} · Auto-matched: {detail.attendanceCount} · Review queue:{" "}
        {detail.reviewQueueCount} ({detail.unresolvedCount} unresolved)
      </p>

      <h2>Auto-matched attendance</h2>
      {attendance.length === 0 && <p>None.</p>}
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "2rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Raw name(s)</th>
            <th>Matched person</th>
            <th>Method</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((record) => (
            <tr key={record._id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{record.rawNames.join(", ")}</td>
              <td>{record.personName}</td>
              <td>{record.matchMethod}</td>
              <td>{record.matchConfidence?.toFixed(2) ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Review queue</h2>
      {reviewEntries.length === 0 && <p>Nothing flagged for review.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {unresolved.map((entry) => (
          <ReviewEntryCard key={entry._id} entry={entry} allPeople={allPeople} />
        ))}
      </ul>

      {resolved.length > 0 && (
        <>
          <h3>Resolved</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {resolved.map((entry) => (
              <ReviewEntryCard key={entry._id} entry={entry} allPeople={allPeople} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
