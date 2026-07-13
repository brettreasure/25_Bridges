import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
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
  const bulkResolveExactMatches = useMutation(api.reviewQueue.bulkResolveExactMatches);

  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

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

  async function runBulkResolve() {
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const { resolvedCount } = await bulkResolveExactMatches({ sessionId: id });
      setBulkMessage(
        resolvedCount === 0 ? "No 100% matches to resolve." : `Resolved ${resolvedCount} exact match(es).`
      );
    } catch (err) {
      setBulkMessage(err instanceof ConvexError && typeof err.data === "string" ? err.data : "That didn't work.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <h1>Session {detail.session.date}</h1>
      <p className="text-secondary">
        Status: {detail.session.status} · Auto-matched: {detail.attendanceCount} · Review queue:{" "}
        {detail.reviewQueueCount} ({detail.unresolvedCount} unresolved)
      </p>

      <h2 style={{ marginTop: "1.5rem" }}>Auto-matched attendance</h2>
      {attendance.length === 0 && <p className="text-secondary">None.</p>}
      <table className="tbl" style={{ marginBottom: "2rem" }}>
        <thead>
          <tr>
            <th>Raw name(s)</th>
            <th>Matched person</th>
            <th>Method</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((record) => (
            <tr key={record._id}>
              <td>{record.rawNames.join(", ")}</td>
              <td>{record.personName}</td>
              <td>{record.matchMethod}</td>
              <td>{record.matchConfidence?.toFixed(2) ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Review queue</h2>
      {reviewEntries.length === 0 && <p className="text-secondary">Nothing flagged for review.</p>}
      {unresolved.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <button type="button" className="btn btn-brand btn-sm" disabled={bulkBusy} onClick={runBulkResolve}>
            Resolve all exact matches
          </button>
          {bulkMessage && <span className="text-secondary" style={{ marginLeft: "0.6rem" }}>{bulkMessage}</span>}
        </div>
      )}
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
