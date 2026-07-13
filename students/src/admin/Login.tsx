import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";

function toMessage(err: unknown): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  return "Sign-in failed. Check your email and password and try again.";
}

export default function Login() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div style={{ maxWidth: 360, margin: "4rem auto", textAlign: "left" }}>
      <h1 style={{ fontSize: "1.4rem" }}>25 Bridges Admin</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          const formData = new FormData(e.currentTarget);
          formData.set("flow", flow);
          signIn("password", formData)
            .catch((err) => {
              setError(toMessage(err));
            })
            .finally(() => setSubmitting(false));
        }}
        style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
      >
        <div className="field">
          <label>Email</label>
          <input className="input" name="email" type="email" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" name="password" type="password" required />
        </div>
        {error && <p className="text-error">{error}</p>}
        <button type="submit" className="btn btn-brand" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
        {flow === "signIn" ? "First time logging in?" : "Already have a password?"}{" "}
        <button
          type="button"
          className="btn-link-plain"
          onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
        >
          {flow === "signIn" ? "Set a password" : "Sign in"}
        </button>
      </p>
      <p className="text-secondary">Only pre-approved admin emails can create an account.</p>
    </div>
  );
}
