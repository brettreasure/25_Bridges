import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import "@fontsource/noto-sans-myanmar/400.css";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { BilingualBlock } from "../components/Bilingual";
import { portalLabels } from "./portalLabels";
import PortalProfileSection from "./PortalProfileSection";
import PortalDuolingoSection from "./PortalDuolingoSection";
import PortalAttendanceSection from "./PortalAttendanceSection";

export default function HouseholdDashboard() {
  const people = useQuery(api.portal.myPeople, {});
  const [selectedId, setSelectedId] = useState<Id<"people"> | null>(null);

  useEffect(() => {
    if (people && people.length > 0 && !selectedId) {
      setSelectedId(people[0]._id);
    }
  }, [people, selectedId]);

  if (people === undefined) return <p>Loading...</p>;

  if (people.length === 0) {
    return (
      <div>
        <h1>My info</h1>
        <BilingualBlock className="text-secondary" text={portalLabels.dashboardEmpty} />
      </div>
    );
  }

  const selected = people.find((p) => p._id === selectedId) ?? people[0];

  return (
    <div>
      <h1>My info</h1>
      {people.length > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {people.map((p) => (
            <button
              key={p._id}
              type="button"
              className={p._id === selected._id ? "btn btn-brand btn-sm" : "btn btn-secondary btn-sm"}
              onClick={() => setSelectedId(p._id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 0 }}>{selected.name}</h2>

      <PortalProfileSection personId={selected._id} role={selected.role} />

      {selected.role === "student" && (
        <div style={{ marginTop: "2rem" }}>
          <PortalDuolingoSection personId={selected._id} />
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <PortalAttendanceSection personId={selected._id} />
      </div>
    </div>
  );
}
