import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatAge } from "../lib/age";
import { toCsv, downloadCsv } from "../lib/csv";

export default function Export() {
  const people = useQuery(api.people.listAll, {});
  const attendance = useQuery(api.attendanceRecords.exportAll, {});

  function exportPeople() {
    if (!people) return;
    const rows = people.map((p) => ({
      name: p.name,
      nameBurmese: p.nameBurmese ?? "",
      nickname: p.nickname ?? "",
      role: p.role,
      approvalStatus: p.approvalStatus,
      email: p.email ?? "",
      camp: p.camp ?? "",
      town: p.location?.town ?? "",
      region: p.location?.region ?? "",
      country: p.location?.country ?? "",
      birthdate: p.birthdate ?? "",
      age: formatAge(p.birthdate) ?? "",
      ambition: p.ambition ?? "",
      school: p.school ?? "",
      interests: p.interests ?? "",
      registrationSource: p.registrationSource,
    }));
    downloadCsv("people.csv", toCsv(rows));
  }

  function exportAttendance() {
    if (!attendance) return;
    downloadCsv("attendance.csv", toCsv(attendance));
  }

  return (
    <div>
      <h1>Export</h1>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="button" className="btn btn-secondary" onClick={exportPeople} disabled={!people}>
          Export people directory ({people?.length ?? "..."})
        </button>
        <button type="button" className="btn btn-secondary" onClick={exportAttendance} disabled={!attendance}>
          Export attendance ({attendance?.length ?? "..."})
        </button>
      </div>
    </div>
  );
}
