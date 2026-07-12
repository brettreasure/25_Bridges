import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export default function AdminHome() {
  const pending = useQuery(api.people.listByApproval, { approvalStatus: "pending" });

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="card">
        <Link to="/admin/pending" className="btn-link-plain">
          Pending registrations
        </Link>
        : {pending === undefined ? "…" : pending.length}
      </div>
      <p className="text-secondary">Session import counts land here in a later phase.</p>
    </div>
  );
}
