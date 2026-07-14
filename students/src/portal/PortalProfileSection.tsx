import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { formatAge } from "../lib/age";

type FormState = {
  name: string;
  nameBurmese: string;
  nickname: string;
  camp: string;
  town: string;
  region: string;
  country: string;
  birthdate: string;
  ambition: string;
  school: string;
  interests: string;
};

// Editable profile fields only — mirrors PersonDetail.tsx's admin form, but
// deliberately omits role, notes, approvalStatus, and email: those aren't
// part of what a student can change about themselves.
export default function PortalProfileSection({ personId }: { personId: Id<"people"> }) {
  const profile = useQuery(api.portal.myProfile, { personId });
  const updateMyProfile = useMutation(api.portal.updateMyProfile);

  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        nameBurmese: profile.nameBurmese ?? "",
        nickname: profile.nickname ?? "",
        camp: profile.camp ?? "",
        town: profile.town ?? "",
        region: profile.region ?? "",
        country: profile.country ?? "",
        birthdate: profile.birthdate ?? "",
        ambition: profile.ambition ?? "",
        school: profile.school ?? "",
        interests: profile.interests ?? "",
      });
      setSaved(false);
    }
  }, [profile]);

  if (profile === undefined || form === null) return <p>Loading...</p>;

  async function handleSave() {
    if (!form) return;
    setError(null);
    setSaved(false);
    try {
      await updateMyProfile({ personId, ...form });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Save failed.");
    }
  }

  const field = (labelText: string, key: keyof FormState) => (
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
    <div style={{ textAlign: "left" }}>
      <p className="text-secondary" style={{ marginBottom: "1.25rem" }}>
        Age: {formatAge(form.birthdate) ?? "unknown"}
      </p>

      {field("Name", "name")}
      {field("Name in Burmese", "nameBurmese")}
      {field("Nickname", "nickname")}
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

      {error && <p className="text-error">{error}</p>}
      {saved && <p className="text-success">Saved.</p>}
      <button type="button" className="btn btn-brand" onClick={handleSave}>
        Save
      </button>
    </div>
  );
}
