import { useState } from "react";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { validatePassword, PASSWORD_RULE_HINT } from "../lib/passwordRule";

// Admin-assisted "forgot password" — there's no email infrastructure, so
// this is what a student calls/messages an admin for. The admin types the
// new password live with them (same word+4-digit convention they'd choose
// themselves), rather than a generated one that loses the point of being
// personally memorable.
export default function HouseholdPasswordSection({ email }: { email: string }) {
  const resetHouseholdPassword = useAction(api.adminActions.resetHouseholdPassword);

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordError = newPassword ? validatePassword(newPassword) : null;

  async function handleReset() {
    setError(null);
    setSaved(false);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setSubmitting(true);
    try {
      await resetHouseholdPassword({ email, newPassword });
      setSaved(true);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Reset failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ textAlign: "left" }}>
      <h2>Portal login</h2>
      <p className="text-secondary">
        Resets the password for the login at <strong>{email}</strong> — this affects every student linked to
        that email, not just this one.
      </p>
      <div className="field">
        <label>New password</label>
        <input
          className="input"
          type="text"
          style={{ width: "100%", maxWidth: 400 }}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="e.g. sunshine4821"
        />
        <p className="text-secondary">{PASSWORD_RULE_HINT}</p>
      </div>
      {error && <p className="text-error">{error}</p>}
      {saved && <p className="text-success">Password reset. Let them know their new password.</p>}
      <button type="button" className="btn btn-brand" disabled={submitting || !newPassword} onClick={handleReset}>
        Reset password
      </button>
    </div>
  );
}
