import { Outlet, Link } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import PortalLogin from "./PortalLogin";
import "../admin/admin.css";

function PortalNav() {
  const { signOut } = useAuthActions();
  return (
    <nav className="admin-nav">
      <Link to="/portal">My info</Link>
      <div className="admin-nav-spacer">
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default function PortalShell() {
  return (
    <div className="admin-shell">
      <AuthLoading>
        <p style={{ padding: "2rem" }}>Loading...</p>
      </AuthLoading>
      <Unauthenticated>
        <PortalLogin />
      </Unauthenticated>
      <Authenticated>
        <PortalNav />
        <main className="admin-main">
          <Outlet />
        </main>
      </Authenticated>
    </div>
  );
}
