import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function MergeSection({ personId, personName }: { personId: Id<"people">; personName: string }) {
  const allPeople = useQuery(api.people.listAll, {});
  const mergeInto = useMutation(api.people.mergeInto);
  const navigate = useNavigate();

  const [targetId, setTargetId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMerge() {
    setError(null);
    try {
      await mergeInto({ sourceId: personId, targetId: targetId as Id<"people"> });
      navigate(`/admin/people/${targetId}`);
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Merge failed.");
      setConfirming(false);
    }
  }

  return (
    <div>
      <h2>Merge duplicate</h2>
      <p className="text-secondary" style={{ marginBottom: "0.75rem" }}>
        If {personName} is the same person as someone else already in the system (e.g. they showed up under two
        different names), merge this record into the other one. Attendance and Duolingo history move over, and
        this record is deleted — it can't be undone.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={confirming}>
          <option value="">Select the person to merge into...</option>
          {allPeople
            ?.filter((p) => p._id !== personId)
            .map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.role})
              </option>
            ))}
        </select>
        {!confirming ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={!targetId} onClick={() => setConfirming(true)}>
            Merge...
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleMerge}>
              Confirm merge (cannot be undone)
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        )}
      </div>
      {error && <p className="text-error">{error}</p>}
    </div>
  );
}
