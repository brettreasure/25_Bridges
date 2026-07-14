import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import "@fontsource/noto-sans-myanmar/400.css";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { validatePassword } from "../lib/passwordRule";
import { BilingualBlock, BilingualInline } from "../components/Bilingual";
import { portalLabels } from "./portalLabels";
import "../admin/admin.css";

function toMessage(err: unknown): string {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  return "That didn't work. Please try again.";
}

// Standalone route outside PortalShell (like /register is outside
// AdminShell) — claiming must work before any session exists.
export default function ClaimAccount() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const claimPerson = useMutation(api.portal.claimPerson);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selected, setSelected] = useState<{ _id: Id<"people">; name: string } | null>(null);

  // Asked explicitly, up front — rather than only inferring it from the
  // email typed in, so the student always sees which case they're in.
  // The actual sign-up/sign-in behavior still goes by what's really true
  // for the email entered (see emailHasAccount below); this choice drives
  // the wording shown, and flags a mismatch if the two disagree.
  const [emailMode, setEmailMode] = useState<"own" | "shared" | null>(null);

  const [email, setEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedEmail(email.trim().toLowerCase()), 400);
    return () => clearTimeout(timeout);
  }, [email]);

  const results = useQuery(
    api.portal.searchClaimable,
    !selected && debouncedSearchTerm ? { term: debouncedSearchTerm } : "skip"
  );
  const emailHasAccount = useQuery(
    api.portal.emailHasPasswordAccount,
    debouncedEmail ? { email: debouncedEmail } : "skip"
  );

  const passwordError = emailHasAccount === false ? validatePassword(password) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError("Pick your name first.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (emailHasAccount === false && passwordError) {
      setError(passwordError);
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    try {
      await claimPerson({ personId: selected._id, email: email.trim() });
      await signIn("password", {
        email: email.trim(),
        password,
        flow: emailHasAccount ? "signIn" : "signUp",
      });
      navigate("/portal");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "3rem auto", textAlign: "left" }}>
      <h1 style={{ fontSize: "1.4rem" }}>Claim your account</h1>
      <BilingualBlock className="text-secondary" text={portalLabels.claimIntro} />

      {!selected && (
        <div className="field">
          <BilingualBlock as="label" text={portalLabels.claimNameLabel} />
          <input
            className="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={portalLabels.claimNameSearchPlaceholder.en}
          />
          {results && results.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
              {results.map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ width: "100%", textAlign: "left", marginBottom: "0.35rem" }}
                    onClick={() => setSelected({ _id: p._id, name: p.name })}
                  >
                    {p.name}
                    {p.nameBurmese ? ` (${p.nameBurmese})` : ""}
                    {p.camp ? ` — ${p.camp}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {debouncedSearchTerm && results && results.length === 0 && (
            <BilingualBlock className="text-secondary" text={portalLabels.claimNoMatch} />
          )}
        </div>
      )}

      {selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <p>
            You selected: <strong>{selected.name}</strong>{" "}
            <button
              type="button"
              className="btn-link-plain"
              onClick={() => {
                setSelected(null);
                setEmailMode(null);
                setEmail("");
                setPassword("");
              }}
            >
              <BilingualInline text={portalLabels.claimNotYou} />
            </button>
          </p>

          {emailMode === null && (
            <div className="field">
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEmailMode("own")}>
                  <BilingualInline text={portalLabels.claimOwnEmailButton} />
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEmailMode("shared")}>
                  <BilingualInline text={portalLabels.claimSharedEmailButton} />
                </button>
              </div>
            </div>
          )}

          {emailMode !== null && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div className="field">
                <BilingualBlock
                  as="label"
                  text={emailMode === "own" ? portalLabels.claimOwnEmailLabel : portalLabels.claimSharedEmailLabel}
                />
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {emailMode === "shared" && (
                  <BilingualBlock className="text-secondary" text={portalLabels.claimSharedEmailHint} />
                )}
                <button type="button" className="btn-link-plain" onClick={() => setEmailMode(null)}>
                  <BilingualInline text={portalLabels.claimChangeAnswer} />
                </button>
              </div>

              {debouncedEmail && emailHasAccount !== undefined && (
                <>
                  {emailMode === "own" && emailHasAccount && (
                    <BilingualBlock className="text-secondary" text={portalLabels.claimMismatchWarning} />
                  )}
                  {emailMode === "shared" && !emailHasAccount && (
                    <BilingualBlock className="text-secondary" text={portalLabels.claimFirstToShare} />
                  )}
                  <div className="field">
                    <BilingualBlock
                      as="label"
                      text={
                        emailHasAccount ? portalLabels.claimExistingPasswordLabel : portalLabels.claimCreatePasswordLabel
                      }
                    />
                    <input
                      className="input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    {!emailHasAccount && (
                      <BilingualBlock className="text-secondary" text={portalLabels.claimPasswordRuleHint} />
                    )}
                    {!emailHasAccount && passwordError && password && <p className="text-error">{passwordError}</p>}
                  </div>
                </>
              )}

              {error && <p className="text-error">{error}</p>}
              <button type="submit" className="btn btn-brand" disabled={submitting || !debouncedEmail}>
                <BilingualInline
                  text={emailHasAccount ? portalLabels.claimContinueButton : portalLabels.claimCreateLoginButton}
                />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
