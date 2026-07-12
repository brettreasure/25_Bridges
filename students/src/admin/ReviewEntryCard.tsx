import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

function toMessage(err: unknown): string {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  return "That didn't work. Please try again.";
}

export default function ReviewEntryCard({
  entry,
  allPeople,
}: {
  entry: Doc<"reviewQueue">;
  allPeople: Doc<"people">[];
}) {
  const linkExisting = useMutation(api.reviewQueue.linkExisting);
  const createNewStudent = useMutation(api.reviewQueue.createNewStudent);
  const markGuest = useMutation(api.reviewQueue.markGuest);
  const ignore = useMutation(api.reviewQueue.ignore);

  const defaultName = entry.parentheticalAlt
    ? entry.rawName.replace(/\s*\(.+\)\s*$/, "")
    : entry.rawName;

  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    entry.suggestedMatches[0]?.personId ?? ""
  );
  const [newName, setNewName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (entry.resolution) {
    return (
      <li style={{ border: "1px solid #eee", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
        <strong>{entry.rawName}</strong> — {entry.reason} — resolved: {entry.resolution}
      </li>
    );
  }

  return (
    <li style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
      <div>
        <strong>{entry.rawName}</strong>{" "}
        <span style={{ fontSize: "0.8rem", color: "#666" }}>({entry.reason})</span>
      </div>
      {entry.splitFrom && (
        <div style={{ fontSize: "0.8rem", color: "#666" }}>split from: {entry.splitFrom}</div>
      )}
      {entry.parentheticalAlt && (
        <div style={{ fontSize: "0.8rem", color: "#666" }}>alt: {entry.parentheticalAlt}</div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap" }}>
        <select value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)}>
          <option value="">Select a person...</option>
          {entry.suggestedMatches.map((m) => (
            <option key={`sug-${m.personId}`} value={m.personId}>
              {m.name} (suggested, {m.score.toFixed(2)})
            </option>
          ))}
          {allPeople
            .filter((p) => !entry.suggestedMatches.some((m) => m.personId === p._id))
            .map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.role})
              </option>
            ))}
        </select>
        <button
          type="button"
          disabled={busy || !selectedPersonId}
          onClick={() =>
            run(() =>
              linkExisting({ entryId: entry._id, personId: selectedPersonId as Id<"people"> })
            )
          }
        >
          Link to existing
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap" }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ minWidth: 200 }} />
        <button type="button" disabled={busy} onClick={() => run(() => createNewStudent({ entryId: entry._id, name: newName }))}>
          Create new student (pending)
        </button>
        <button type="button" disabled={busy} onClick={() => run(() => markGuest({ entryId: entry._id, name: newName }))}>
          Mark as guest
        </button>
      </div>

      <div style={{ marginTop: "0.5rem" }}>
        <button type="button" disabled={busy} onClick={() => run(() => ignore({ entryId: entry._id }))}>
          Ignore
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </li>
  );
}
