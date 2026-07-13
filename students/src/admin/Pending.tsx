import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Pending() {
  const pending = useQuery(api.people.listByApproval, { approvalStatus: "pending" });
  const approve = useMutation(api.people.approve);
  const reject = useMutation(api.people.reject);

  if (pending === undefined) return <p>Loading...</p>;

  return (
    <div>
      <h1>Pending registrations</h1>
      {pending.length === 0 && <p className="text-secondary">Nothing to review.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {pending.map((person) => (
          <li key={person._id} className="card">
            <strong>{person.name}</strong>
            {person.nameBurmese && <span> ({person.nameBurmese})</span>}
            <div className="text-secondary" style={{ margin: "0.4rem 0" }}>
              {person.nickname && <span>Nickname: {person.nickname} · </span>}
              {person.camp && <span>Camp: {person.camp} · </span>}
              {person.location?.town && <span>Town: {person.location.town} · </span>}
              {person.email && <span>Email: {person.email}</span>}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => approve({ id: person._id })}>
                Approve
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => reject({ id: person._id })}>
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
