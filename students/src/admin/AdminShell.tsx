import { Outlet, Link } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import Login from "./Login";
import "./admin.css";

function AdminNav() {
  const { signOut } = useAuthActions();
  return (
    <nav className="admin-nav">
      <Link to="/admin">Dashboard</Link>
      <Link to="/admin/pending">Pending</Link>
      <Link to="/admin/people">People</Link>
      <Link to="/admin/import">Import</Link>
      <Link to="/admin/sessions">Sessions</Link>
      <Link to="/admin/export">Export</Link>
      <div className="admin-nav-spacer">
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default function AdminShell() {
  return (
    <div className="admin-shell">
      <AuthLoading>
        <p style={{ padding: "2rem" }}>Loading...</p>
      </AuthLoading>
      <Unauthenticated>
        <Login />
      </Unauthenticated>
      <Authenticated>
        <AdminNav />
        <main className="admin-main">
          <Outlet />
        </main>
      </Authenticated>
    </div>
  );
}
