import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import "@fontsource/noto-sans-myanmar/400.css";
import { BilingualBlock, BilingualInline } from "../components/Bilingual";
import { portalLabels } from "./portalLabels";

function toMessage(err: unknown): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  return "Sign-in failed. Check your email and password and try again.";
}

// Sign-in only — unlike the admin Login, there's no sign-up toggle here.
// A login only ever gets its first password via /portal/claim, which
// creates the account itself; this page is purely for returning students.
export default function PortalLogin() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div style={{ maxWidth: 360, margin: "4rem auto", textAlign: "left" }}>
      <h1 style={{ fontSize: "1.4rem" }}>
        {portalLabels.portalTitle.en}
        {portalLabels.portalTitle.my && (
          <>
            <br />
            <span lang="my" className="lang-my">
              {portalLabels.portalTitle.my}
            </span>
          </>
        )}
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          const formData = new FormData(e.currentTarget);
          formData.set("flow", "signIn");
          signIn("password", formData)
            .catch((err) => {
              setError(toMessage(err));
            })
            .finally(() => setSubmitting(false));
        }}
        style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
      >
        <div className="field">
          <BilingualBlock as="label" text={portalLabels.loginEmailLabel} />
          <input className="input" name="email" type="email" required />
        </div>
        <div className="field">
          <BilingualBlock as="label" text={portalLabels.loginPasswordLabel} />
          <input className="input" name="password" type="password" required />
        </div>
        {error && <p className="text-error">{error}</p>}
        <button type="submit" className="btn btn-brand" disabled={submitting}>
          <BilingualInline text={portalLabels.loginSignInButton} />
        </button>
      </form>
      <p style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
        <BilingualInline text={portalLabels.portalNoLoginYet} />{" "}
        <a className="btn-link-plain" href="/portal/claim">
          <BilingualInline text={portalLabels.portalClaimLink} />
        </a>
      </p>
    </div>
  );
}
