import { Outlet, Link } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
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

// Every authenticated session used to be an admin by definition — now
// household/student accounts can authenticate too (via /portal/claim), so
// this checks admin status explicitly instead of rendering admin-only
// queries straight into an <Outlet/> that would throw uncaught.
function AdminGate() {
  const { signOut } = useAuthActions();
  const isAdmin = useQuery(api.adminGuard.currentUserIsAdmin, {});

  if (isAdmin === undefined) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: "2rem" }}>
        <p>This account isn't an admin. Students and families should sign in at /portal instead.</p>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <AdminNav />
      <main className="admin-main">
        <Outlet />
      </main>
    </>
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
        <AdminGate />
      </Authenticated>
    </div>
  );
}
