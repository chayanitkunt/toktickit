import { useState } from "react";
import { useAuth } from "../AuthContext";

const ZEN_GREEN = "#006B3C";

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showForgotPasswordNote, setShowForgotPasswordNote] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = "Email address is required.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim(), password);
      // On success, AuthContext's user state updates and App re-renders
      // into either the mandatory Change Password screen or the app shell.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}
    >
      <div
        className="card shadow-sm border-0 p-4 p-md-5 w-100"
        style={{ maxWidth: "420px" }}
      >
        <div className="d-flex align-items-center gap-2 mb-4">
          <span style={{ fontSize: "1.5rem", color: ZEN_GREEN }}>◷</span>
          <h1
            className="fw-bold mb-0"
            style={{ fontSize: "1.25rem", color: "#1A2E26" }}
          >
            TokTickIT
          </h1>
        </div>

        <h2 className="h5 fw-semibold mb-3" style={{ color: "#1A2E26" }}>
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="login-email" className="form-label">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className={`form-control ${
                fieldErrors.email ? "is-invalid" : ""
              }`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              placeholder="you@tiktockit.com"
            />
            {fieldErrors.email && (
              <div className="invalid-feedback">{fieldErrors.email}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="input-group">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={`form-control ${
                  fieldErrors.password ? "is-invalid" : ""
                }`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword((value) => !value)}
                tabIndex={-1}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
              {fieldErrors.password && (
                <div className="invalid-feedback">
                  {fieldErrors.password}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn w-100 text-white fw-semibold"
            style={{ backgroundColor: ZEN_GREEN }}
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            style={{ color: ZEN_GREEN }}
            onClick={() => setShowForgotPasswordNote(true)}
          >
            Forgot your password?
          </button>

          {showForgotPasswordNote && (
            <p className="text-muted small mt-2 mb-0">
              Password reset isn't self-service yet — please ask your
              Administrator to set a new initial password for your account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
