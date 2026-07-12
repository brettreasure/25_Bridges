import { useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { formatAge } from "../lib/age";

const ROLES = ["student", "teacher", "aide", "guest"] as const;
const STATUSES = ["pending", "approved", "rejected"] as const;

export default function People() {
  const [role, setRole] = useState<(typeof ROLES)[number] | "">("");
  const [approvalStatus, setApprovalStatus] = useState<(typeof STATUSES)[number] | "">("");

  const people = useQuery(api.people.listAll, {
    role: role || undefined,
    approvalStatus: approvalStatus || undefined,
  });

  return (
    <div>
      <h1>People</h1>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={approvalStatus}
          onChange={(e) => setApprovalStatus(e.target.value as typeof approvalStatus)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {people === undefined && <p>Loading...</p>}
      {people && people.length === 0 && <p className="text-secondary">No people match those filters.</p>}

      <table className="tbl">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Camp</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          {people?.map((person) => (
            <tr key={person._id}>
              <td>
                <Link to={`/admin/people/${person._id}`} className="btn-link-plain">
                  {person.name}
                </Link>
              </td>
              <td>{person.role}</td>
              <td>{person.approvalStatus}</td>
              <td>{person.camp ?? ""}</td>
              <td>{formatAge(person.birthdate) ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
