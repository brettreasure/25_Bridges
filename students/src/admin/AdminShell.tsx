import { Outlet, Link } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import Login from "./Login";

function AdminNav() {
  const { signOut } = useAuthActions();
  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "0.75rem 1rem", borderBottom: "1px solid #ddd" }}>
      <Link to="/admin">Dashboard</Link>
      <Link to="/admin/pending">Pending</Link>
      <Link to="/admin/people">People</Link>
      <Link to="/admin/import">Import</Link>
      <Link to="/admin/sessions">Sessions</Link>
      <Link to="/admin/export">Export</Link>
      <button type="button" onClick={() => signOut()} style={{ marginLeft: "auto" }}>
        Sign out
      </button>
    </nav>
  );
}

export default function AdminShell() {
  return (
    <>
      <AuthLoading>
        <p style={{ padding: "2rem", fontFamily: "sans-serif" }}>Loading...</p>
      </AuthLoading>
      <Unauthenticated>
        <Login />
      </Unauthenticated>
      <Authenticated>
        <AdminNav />
        <main style={{ padding: "1rem", fontFamily: "sans-serif" }}>
          <Outlet />
        </main>
      </Authenticated>
    </>
  );
}
