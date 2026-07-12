import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { detectHonorific } from "../lib/honorifics";

const ROLES = ["student", "teacher", "aide", "guest"] as const;
type Role = (typeof ROLES)[number];

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
  const createNewPerson = useMutation(api.reviewQueue.createNewPerson);
  const ignore = useMutation(api.reviewQueue.ignore);

  const rawForNaming = entry.parentheticalAlt
    ? entry.rawName.replace(/\s*\(.+\)\s*$/, "")
    : entry.rawName;
  const { suggestedName, isLikelyTeacher } = detectHonorific(rawForNaming);

  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    entry.suggestedMatches[0]?.personId ?? ""
  );
  const [newName, setNewName] = useState(suggestedName);
  const [newRole, setNewRole] = useState<Role>(isLikelyTeacher ? "teacher" : "student");
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
      <li className="card card-muted">
        <strong>{entry.rawName}</strong> — {entry.reason} — resolved: {entry.resolution}
      </li>
    );
  }

  return (
    <li className="card">
      <div>
        <strong>{entry.rawName}</strong> <span className="text-secondary">({entry.reason})</span>
        {isLikelyTeacher && <span className="tag" style={{ marginLeft: 6 }}>teacher/aide honorific</span>}
      </div>
      {entry.splitFrom && <div className="text-secondary">split from: {entry.splitFrom}</div>}
      {entry.parentheticalAlt && <div className="text-secondary">alt: {entry.parentheticalAlt}</div>}

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem", flexWrap: "wrap" }}>
        <select className="input" value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)}>
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
          className="btn btn-secondary btn-sm"
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
        <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ minWidth: 200 }} />
        <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-brand btn-sm"
          disabled={busy}
          onClick={() => run(() => createNewPerson({ entryId: entry._id, name: newName, role: newRole }))}
        >
          Add as new {newRole}
        </button>
      </div>

      <div style={{ marginTop: "0.5rem" }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => run(() => ignore({ entryId: entry._id }))}>
          Ignore
        </button>
      </div>

      {error && <p className="text-error">{error}</p>}
    </li>
  );
}
