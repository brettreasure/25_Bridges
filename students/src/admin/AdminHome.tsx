import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export default function AdminHome() {
  const pending = useQuery(api.people.listByApproval, { approvalStatus: "pending" });

  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        <Link to="/admin/pending">Pending registrations</Link>: {pending === undefined ? "…" : pending.length}
      </p>
      <p>Session import counts land here in a later phase.</p>
    </div>
  );
}
