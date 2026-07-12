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
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value as typeof approvalStatus)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {people === undefined && <p>Loading...</p>}
      {people && people.length === 0 && <p>No people match those filters.</p>}

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Camp</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          {people?.map((person) => (
            <tr key={person._id} style={{ borderBottom: "1px solid #eee" }}>
              <td>
                <Link to={`/admin/people/${person._id}`}>{person.name}</Link>
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
