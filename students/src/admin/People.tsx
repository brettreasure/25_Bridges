import { useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { formatAge, ageInDays } from "../lib/age";
import { scoreToLevel } from "../lib/duolingo";

const ROLES = ["student", "teacher", "aide", "guest"] as const;
const STATUSES = ["pending", "approved", "rejected"] as const;

const SORT_KEYS = ["name", "role", "status", "camp", "age", "duoLevel"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "camp", label: "Camp" },
  { key: "age", label: "Age" },
  { key: "duoLevel", label: "Duo Level" },
];

export default function People() {
  const [role, setRole] = useState<(typeof ROLES)[number] | "">("");
  const [approvalStatus, setApprovalStatus] = useState<(typeof STATUSES)[number] | "">("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const people = useQuery(api.people.listAll, {
    role: role || undefined,
    approvalStatus: approvalStatus || undefined,
  });
  const latestDuolingo = useQuery(api.duolingo.latestForAll, {});

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function sortValue(person: NonNullable<typeof people>[number]): string | number | null {
    switch (sortKey) {
      case "name":
        return person.name.toLowerCase();
      case "role":
        return person.role;
      case "status":
        return person.approvalStatus;
      case "camp":
        return person.camp?.toLowerCase() ?? null;
      case "age":
        return ageInDays(person.birthdate);
      case "duoLevel":
        return latestDuolingo?.[person._id]?.score ?? null;
    }
  }

  const sorted = people
    ? [...people].sort((a, b) => {
        const av = sortValue(a);
        const bv = sortValue(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1 * sortDir;
        if (av > bv) return 1 * sortDir;
        return 0;
      })
    : undefined;

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
            {COLUMNS.map((col) => (
              <th key={col.key} onClick={() => toggleSort(col.key)} style={{ cursor: "pointer", userSelect: "none" }}>
                {col.label}
                {sortKey === col.key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted?.map((person) => {
            const duo = latestDuolingo?.[person._id];
            return (
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
                <td>{duo ? `${scoreToLevel(duo.score)} (${duo.score})` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
