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
    <div style={{ maxWidth: 360, margin: "4rem auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem" }}>25 Bridges Admin</h1>
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
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <label>
          Email
          <input name="email" type="email" required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Password
          <input name="password" type="password" required style={{ display: "block", width: "100%" }} />
        </label>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
        {flow === "signIn" ? "First time logging in?" : "Already have a password?"}{" "}
        <button
          type="button"
          onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          style={{ background: "none", border: "none", color: "blue", cursor: "pointer", padding: 0 }}
        >
          {flow === "signIn" ? "Set a password" : "Sign in"}
        </button>
      </p>
      <p style={{ fontSize: "0.8rem", color: "#666" }}>
        Only pre-approved admin emails can create an account.
      </p>
    </div>
  );
}
