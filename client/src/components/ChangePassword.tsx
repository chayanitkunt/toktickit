import { useState } from "react";
import { useAuth } from "../AuthContext";

const ZEN_GREEN = "#006B3C";

interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "Be at least 8 characters",
    test: (value) => value.length >= 8,
  },
  {
    id: "case",
    label: "Include upper and lower case letters",
    test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
  {
    id: "number-special",
    label: "Include a number and a special character",
    test: (value) => /\d/.test(value) && /[^A-Za-z0-9]/.test(value),
  },
];

export default function ChangePassword() {
  const { changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (!PASSWORD_RULES.every((rule) => rule.test(newPassword))) {
      errors.newPassword = "New password does not meet the requirements.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
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
      await changePassword(currentPassword, newPassword);
      // On success, AuthContext's user state updates (mustChangePassword
      // becomes false) and App re-renders into the authenticated shell.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to change password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUseDifferentAccount() {
    await logout();
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}
    >
      <div
        className="card shadow-sm border-0 p-4 p-md-5 w-100"
        style={{ maxWidth: "440px" }}
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

        <h2 className="h5 fw-semibold mb-1" style={{ color: "#1A2E26" }}>
          Change Your Password
        </h2>
        <p className="text-muted small mb-4">
          You must change your password to continue.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="current-password" className="form-label">
              Current (temporary) password
            </label>
            <div className="input-group">
              <input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                className={`form-control ${
                  fieldErrors.currentPassword ? "is-invalid" : ""
                }`}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowCurrent((value) => !value)}
                tabIndex={-1}
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
              {fieldErrors.currentPassword && (
                <div className="invalid-feedback">
                  {fieldErrors.currentPassword}
                </div>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="new-password" className="form-label">
              New password
            </label>
            <div className="input-group">
              <input
                id="new-password"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                className={`form-control ${
                  fieldErrors.newPassword ? "is-invalid" : ""
                }`}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowNew((value) => !value)}
                tabIndex={-1}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? "Hide" : "Show"}
              </button>
              {fieldErrors.newPassword && (
                <div className="invalid-feedback">
                  {fieldErrors.newPassword}
                </div>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="confirm-new-password" className="form-label">
              Confirm new password
            </label>
            <div className="input-group">
              <input
                id="confirm-new-password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                className={`form-control ${
                  fieldErrors.confirmPassword ? "is-invalid" : ""
                }`}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowConfirm((value) => !value)}
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
              {fieldErrors.confirmPassword && (
                <div className="invalid-feedback">
                  {fieldErrors.confirmPassword}
                </div>
              )}
            </div>
          </div>

          <div
            className="rounded p-3 mb-3"
            style={{ backgroundColor: "#EAF5EE" }}
          >
            <p className="fw-semibold small mb-2" style={{ color: "#1A2E26" }}>
              Password must:
            </p>
            <ul className="list-unstyled mb-0 small">
              {PASSWORD_RULES.map((rule) => {
                const satisfied = rule.test(newPassword);
                return (
                  <li
                    key={rule.id}
                    className="d-flex align-items-center gap-2"
                    style={{ color: satisfied ? ZEN_GREEN : "#5B6C64" }}
                  >
                    <span aria-hidden="true">{satisfied ? "✓" : "○"}</span>
                    <span>{rule.label}</span>
                  </li>
                );
              })}
            </ul>
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
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            style={{ color: ZEN_GREEN }}
            onClick={handleUseDifferentAccount}
            disabled={submitting}
          >
            Use a different account
          </button>
        </div>
      </div>
    </div>
  );
}
