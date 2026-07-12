import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function DeleteSection({ personId, personName }: { personId: Id<"people">; personName: string }) {
  const deletePerson = useMutation(api.people.deletePerson);
  const navigate = useNavigate();

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deletePerson({ id: personId });
      navigate("/admin/people");
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Delete failed.");
      setConfirming(false);
    }
  }

  return (
    <div>
      <h2>Delete record</h2>
      <p className="text-secondary" style={{ marginBottom: "0.75rem" }}>
        Permanently removes {personName} along with their attendance and Duolingo history — for cleaning up test
        or duplicate records. This can't be undone.
      </p>
      {!confirming ? (
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
          Delete this record...
        </button>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
            Confirm delete (cannot be undone)
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-error">{error}</p>}
    </div>
  );
}
