import { Navigate, Route, Routes } from "react-router-dom";
import Register from "./pages/Register";
import AdminShell from "./admin/AdminShell";
import AdminHome from "./admin/AdminHome";
import Pending from "./admin/Pending";
import People from "./admin/People";
import PersonDetail from "./admin/PersonDetail";
import Import from "./admin/Import";
import Sessions from "./admin/Sessions";
import ReviewQueue from "./admin/ReviewQueue";
import Export from "./admin/Export";
import PortalShell from "./portal/PortalShell";
import ClaimAccount from "./portal/ClaimAccount";
import HouseholdDashboard from "./portal/HouseholdDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/portal/claim" element={<ClaimAccount />} />
      <Route path="/portal" element={<PortalShell />}>
        <Route index element={<HouseholdDashboard />} />
      </Route>
      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<AdminHome />} />
        <Route path="pending" element={<Pending />} />
        <Route path="people" element={<People />} />
        <Route path="people/:id" element={<PersonDetail />} />
        <Route path="import" element={<Import />} />
        <Route path="import/:sessionId/review" element={<ReviewQueue />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="export" element={<Export />} />
      </Route>
    </Routes>
  );
}
