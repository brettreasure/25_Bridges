import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { formatAge } from "../lib/age";
import DuolingoSection from "./DuolingoSection";
import AttendanceHistorySection from "./AttendanceHistorySection";
import MergeSection from "./MergeSection";
import DeleteSection from "./DeleteSection";

const ROLES = ["student", "teacher", "aide", "guest"] as const;

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const person = useQuery(api.people.getPerson, id ? { id: id as Id<"people"> } : "skip");
  const updatePerson = useMutation(api.people.updatePerson);

  const [form, setForm] = useState<{
    name: string;
    nameBurmese: string;
    nickname: string;
    role: (typeof ROLES)[number];
    email: string;
    camp: string;
    town: string;
    region: string;
    country: string;
    birthdate: string;
    ambition: string;
    school: string;
    interests: string;
    notes: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (person) {
      setForm({
        name: person.name,
        nameBurmese: person.nameBurmese ?? "",
        nickname: person.nickname ?? "",
        role: person.role,
        email: person.email ?? "",
        camp: person.camp ?? "",
        town: person.location?.town ?? "",
        region: person.location?.region ?? "",
        country: person.location?.country ?? "",
        birthdate: person.birthdate ?? "",
        ambition: person.ambition ?? "",
        school: person.school ?? "",
        interests: person.interests ?? "",
        notes: person.notes ?? "",
      });
    }
  }, [person]);

  if (person === undefined || form === null) return <p>Loading...</p>;
  if (person === null) return <p>Person not found.</p>;

  async function handleSave() {
    if (!form || !id) return;
    setError(null);
    setSaved(false);
    try {
      await updatePerson({
        id: id as Id<"people">,
        name: form.name,
        nameBurmese: form.nameBurmese,
        nickname: form.nickname,
        role: form.role,
        email: form.email,
        camp: form.camp,
        town: form.town,
        region: form.region,
        country: form.country,
        birthdate: form.birthdate,
        ambition: form.ambition,
        school: form.school,
        interests: form.interests,
        notes: form.notes,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Save failed.");
    }
  }

  const field = (labelText: string, key: keyof typeof form) => (
    <div className="field">
      <label>{labelText}</label>
      <input
        className="input"
        style={{ width: "100%", maxWidth: 400 }}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div>
      <h1>{person.name}</h1>
      <p className="text-secondary" style={{ marginBottom: "1.25rem" }}>
        Age: {formatAge(form.birthdate) ?? "unknown"} · Status: {person.approvalStatus} ·
        Registration: {person.registrationSource}
      </p>

      {field("Name", "name")}
      {field("Name in Burmese", "nameBurmese")}
      {field("Nickname", "nickname")}

      <div className="field">
        <label>Role</label>
        <select
          className="input"
          style={{ width: "100%", maxWidth: 400 }}
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as (typeof ROLES)[number] })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {field("Email", "email")}
      {field("Camp", "camp")}
      {field("Town", "town")}
      {field("Region", "region")}
      {field("Country", "country")}

      <div className="field">
        <label>Date of birth</label>
        <input
          className="input"
          type="date"
          value={form.birthdate}
          onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
        />
      </div>

      {field("Ambition", "ambition")}
      {field("School", "school")}

      <div className="field">
        <label>Interests</label>
        <textarea
          className="input"
          style={{ width: "100%", maxWidth: 400 }}
          rows={3}
          value={form.interests}
          onChange={(e) => setForm({ ...form, interests: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Admin notes</label>
        <textarea
          className="input"
          style={{ width: "100%", maxWidth: 400 }}
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {error && <p className="text-error">{error}</p>}
      {saved && <p className="text-success">Saved.</p>}
      <button type="button" className="btn btn-brand" onClick={handleSave}>
        Save
      </button>

      <div style={{ marginTop: "2rem" }}>
        <DuolingoSection personId={person._id} />
      </div>

      <div style={{ marginTop: "2rem" }}>
        <AttendanceHistorySection personId={person._id} />
      </div>

      <div className="card" style={{ marginTop: "2rem" }}>
        <MergeSection personId={person._id} personName={person.name} />
      </div>

      <div className="card">
        <DeleteSection personId={person._id} personName={person.name} />
      </div>
    </div>
  );
}
