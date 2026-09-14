import { useEffect, useState } from "react";
import {
  createAdminUser,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  type AdminUser,
  type UserRole,
} from "../api";
import { useAuth } from "../AuthContext";

// ---------------------------------------------------------------------------
// Issue 7 — Administrator User Management (FR-15..FR-19, BR-13..BR-16)
// docs/lab-03/ui-spec.md §6. Single screen, two-pane on desktop (list +
// slide-over create/edit panel), stacked on mobile.
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<UserRole, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
};

type PanelMode = "create" | "edit" | null;

interface FormState {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  initialPassword: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "REQUESTER",
  isActive: true,
  initialPassword: "",
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>();

  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [panelBanner, setPanelBanner] = useState("");
  const [saving, setSaving] = useState(false);

  const [resetTargetId, setResetTargetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetErrors, setResetErrors] = useState<string[]>([]);
  const [resetting, setResetting] = useState(false);

  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadUsers() {
    setLoading(true);
    setError("");
    setForbidden(false);

    try {
      const result = await getAdminUsers({
        q: search || undefined,
        role: roleFilter,
        page: 1,
        pageSize: 100,
      });

      setUsers(result.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to retrieve users";

      if (
        message.toLowerCase().includes("permission") ||
        message.toLowerCase().includes("forbidden")
      ) {
        setForbidden(true);
      } else {
        setError(message);
      }

      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  function openCreatePanel() {
    setPanelMode("create");
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
    setPanelBanner("");
  }

  function openEditPanel(target: AdminUser) {
    setPanelMode("edit");
    setEditingUser(target);
    setForm({
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive,
      initialPassword: "",
    });
    setFormErrors([]);
    setPanelBanner("");
    setResetTargetId(null);
  }

  function closePanel() {
    setPanelMode(null);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
    setPanelBanner("");
    setResetTargetId(null);
    setResetPassword("");
    setResetErrors([]);
  }

  function validateForm(): string[] {
    const errors: string[] = [];

    if (form.name.trim() === "") {
      errors.push("Full Name is required.");
    }

    if (
      form.email.trim() === "" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      errors.push("A valid Email Address is required.");
    }

    if (panelMode === "create" && form.initialPassword.trim() === "") {
      errors.push("Initial Password is required.");
    }

    return errors;
  }

  async function handleSave() {
    const errors = validateForm();
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);
    setPanelBanner("");
    setSaving(true);

    try {
      if (panelMode === "create") {
        await createAdminUser({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          isActive: form.isActive,
          initialPassword: form.initialPassword,
        });
        setToast("User created");
      } else if (panelMode === "edit" && editingUser) {
        await updateAdminUser(editingUser.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          isActive: form.isActive,
        });
        setToast("User updated");
      }

      closePanel();
      await loadUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save user";
      setPanelBanner(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateToggle() {
    if (!editingUser) return;

    setPanelBanner("");
    setSaving(true);

    try {
      await updateAdminUser(editingUser.id, {
        isActive: !editingUser.isActive,
      });
      setToast(editingUser.isActive ? "User deactivated" : "User activated");
      closePanel();
      await loadUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update user";
      setPanelBanner(message);
    } finally {
      setSaving(false);
    }
  }

  function openResetPassword(userId: number) {
    setResetTargetId(userId);
    setResetPassword("");
    setResetErrors([]);
  }

  async function handleResetPassword() {
    if (resetTargetId === null) return;

    if (resetPassword.trim() === "") {
      setResetErrors(["A new initial password is required."]);
      return;
    }

    setResetErrors([]);
    setResetting(true);

    try {
      await resetAdminUserPassword(resetTargetId, resetPassword);
      setToast("New initial password set");
      setResetTargetId(null);
      setResetPassword("");
      await loadUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to reset password";
      setResetErrors([message]);
    } finally {
      setResetting(false);
    }
  }

  function renderRoleBadge(role: UserRole) {
    const styles: Record<UserRole, { bg: string; color: string }> = {
      REQUESTER: { bg: "#E0F2FE", color: "#0369A1" },
      IT_STAFF: { bg: "#DCFCE7", color: "#15803D" },
      ADMINISTRATOR: { bg: "#F3E8FF", color: "#7E22CE" },
    };
    const style = styles[role];

    return (
      <span
        className="badge rounded-pill fw-semibold"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {ROLE_LABELS[role]}
      </span>
    );
  }

  function renderStatusBadge(isActive: boolean) {
    return (
      <span
        className="badge rounded-pill fw-semibold"
        style={
          isActive
            ? { backgroundColor: "#DCFCE7", color: "#15803D" }
            : { backgroundColor: "#FEE2E2", color: "#B91C1C" }
        }
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  }

  const isSelf = (target: AdminUser) => currentUser?.id === target.id;

  return (
    <div className="py-3">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1A2E26" }}>
            Users
          </h1>
          <p className="mb-0" style={{ color: "#5A6E65" }}>
            View, create, and manage user accounts.
          </p>
        </div>

        <div className="d-flex gap-2 align-self-start align-self-md-auto">
          <button
            type="button"
            className="btn px-4 fw-semibold"
            onClick={openCreatePanel}
            style={{
              backgroundColor: "#006B3C",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
            }}
          >
            + Create User
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="alert mb-4"
          role="status"
          data-testid="user-mgmt-toast"
          style={{
            color: "#15803D",
            backgroundColor: "#DCFCE7",
            border: "1px solid #86EFAC",
            borderRadius: "8px",
          }}
        >
          {toast}
        </div>
      )}

      {/* Two-pane layout: user list (left) + create/edit panel (right, when open) */}
      <div className="row g-4">
        <div className={panelMode ? "col-12 col-xl-7" : "col-12"}>
          {/* Search & Filter row */}
          <div
            className="card mb-4"
            style={{
              border: "1px solid #E0E6E2",
              borderRadius: "10px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div className="card-body p-3 p-md-4">
              <div className="row g-3">
                <div className="col-12 col-md-8">
                  <label
                    htmlFor="admin-user-search"
                    className="form-label fw-semibold"
                    style={{ color: "#1A2E26" }}
                  >
                    Search
                  </label>
                  <div className="input-group">
                    <span
                      className="input-group-text"
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#C8D4CE",
                        color: "#5A6E65",
                      }}
                    >
                      🔍
                    </span>
                    <input
                      id="admin-user-search"
                      type="search"
                      className="form-control"
                      placeholder="Search users by name or email..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      style={{ borderColor: "#C8D4CE", minHeight: "44px" }}
                    />
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label
                    htmlFor="admin-role-filter"
                    className="form-label fw-semibold"
                    style={{ color: "#1A2E26" }}
                  >
                    Role
                  </label>
                  <select
                    id="admin-role-filter"
                    className="form-select"
                    value={roleFilter ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRoleFilter(value ? (value as UserRole) : undefined);
                    }}
                    style={{ borderColor: "#C8D4CE", minHeight: "44px" }}
                  >
                    <option value="">All Roles</option>
                    <option value="REQUESTER">Requester</option>
                    <option value="IT_STAFF">IT Staff</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Forbidden State */}
          {forbidden && (
            <div
              className="alert"
              style={{
                color: "#B45309",
                backgroundColor: "#FEF3C7",
                border: "1px solid #FDE68A",
                borderRadius: "8px",
              }}
            >
              You do not have permission to view User Management.
            </div>
          )}

          {/* Error Banner (safe failure) */}
          {!forbidden && error && (
            <div
              className="alert mb-4"
              style={{
                color: "#D32F2F",
                backgroundColor: "#FDE8E8",
                border: "1px solid #D32F2F",
              }}
            >
              {error}
            </div>
          )}

          {/* Loading */}
          {!forbidden && loading && (
            <div className="text-center py-5">
              <div
                className="spinner-border"
                style={{ color: "#006B3C" }}
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {/* Empty / No-results state */}
          {!forbidden && !loading && !error && users.length === 0 && (
            <div
              className="card text-center"
              style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
            >
              <div className="card-body py-5">
                <h2 className="h5 fw-bold" style={{ color: "#1A2E26" }}>
                  No users match your search.
                </h2>
                <p style={{ color: "#5A6E65" }}>
                  Try adjusting your search term or role filter.
                </p>
              </div>
            </div>
          )}

          {/* User List */}
          {!forbidden && !loading && !error && users.length > 0 && (
            <div
              className="table-responsive"
              style={{
                border: "1px solid #E0E6E2",
                borderRadius: "10px",
                backgroundColor: "#FFFFFF",
              }}
            >
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr style={{ backgroundColor: "#F5F7F6" }}>
                    <th style={{ color: "#1A2E26" }}>Name</th>
                    <th style={{ color: "#1A2E26" }}>Email</th>
                    <th style={{ color: "#1A2E26" }}>Role</th>
                    <th style={{ color: "#1A2E26" }}>Status</th>
                    <th style={{ color: "#1A2E26" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((target) => {
                    const isSelected =
                      panelMode === "edit" && editingUser?.id === target.id;

                    return (
                      <tr
                        key={target.id}
                        onClick={() => openEditPanel(target)}
                        style={{
                          cursor: "pointer",
                          backgroundColor: isSelected ? "#EAF7EF" : undefined,
                          borderLeft: isSelected
                            ? "3px solid #006B3C"
                            : "3px solid transparent",
                        }}
                      >
                        <td data-label="Name" style={{ color: "#1A2E26" }}>
                          {target.name}
                          {isSelf(target) && (
                            <span
                              className="small ms-2"
                              style={{ color: "#5A6E65" }}
                            >
                              (you)
                            </span>
                          )}
                        </td>
                        <td data-label="Email" style={{ color: "#1A2E26" }}>
                          {target.email}
                        </td>
                        <td data-label="Role">{renderRoleBadge(target.role)}</td>
                        <td data-label="Status">
                          {renderStatusBadge(target.isActive)}
                        </td>
                        <td data-label="Edit" className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditPanel(target);
                            }}
                            style={{
                              borderColor: "#C8D4CE",
                              color: "#1A2E26",
                              backgroundColor: "#FFFFFF",
                              border: "1px solid #C8D4CE",
                              borderRadius: "999px",
                              padding: "0.25rem 0.9rem",
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit panel — docked beside the list on wide screens, stacked below on narrow screens */}
        {panelMode && (
          <div className="col-12 col-xl-5">
            <div
              className="card"
              role="dialog"
              aria-modal="false"
              aria-label={
                panelMode === "create" ? "Create New User" : "Edit User"
              }
              style={{
                border: "1px solid #E0E6E2",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                position: "sticky",
                top: "1rem",
              }}
            >
              <div className="card-body p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 fw-bold mb-0" style={{ color: "#1A2E26" }}>
                    {panelMode === "create" ? "Create New User" : "Edit User"}
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closePanel}
                  />
                </div>

                {panelBanner && (
                  <div
                    className="alert"
                    style={{
                      color: "#D32F2F",
                      backgroundColor: "#FDE8E8",
                      border: "1px solid #D32F2F",
                    }}
                  >
                    {panelBanner}
                  </div>
                )}

                {formErrors.length > 0 && (
                  <div
                    className="alert"
                    style={{
                      color: "#B45309",
                      backgroundColor: "#FEF3C7",
                      border: "1px solid #FDE68A",
                    }}
                  >
                    <ul className="mb-0 ps-3">
                      {formErrors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mb-3">
                  <label
                    htmlFor="admin-form-name"
                    className="form-label fw-semibold"
                    style={{ color: "#1A2E26" }}
                  >
                    Full Name
                  </label>
                  <input
                    id="admin-form-name"
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    style={{ borderColor: "#C8D4CE" }}
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="admin-form-email"
                    className="form-label fw-semibold"
                    style={{ color: "#1A2E26" }}
                  >
                    Email Address
                  </label>
                  <input
                    id="admin-form-email"
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    style={{ borderColor: "#C8D4CE" }}
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="admin-form-role"
                    className="form-label fw-semibold"
                    style={{ color: "#1A2E26" }}
                  >
                    Role
                  </label>
                  <select
                    id="admin-form-role"
                    className="form-select"
                    value={form.role}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        role: event.target.value as UserRole,
                      }))
                    }
                    style={{ borderColor: "#C8D4CE" }}
                  >
                    <option value="REQUESTER">Requester</option>
                    <option value="IT_STAFF">IT Staff</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                  </select>
                </div>

                <div className="mb-3 form-check form-switch">
                  <input
                    id="admin-form-active"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <label
                    htmlFor="admin-form-active"
                    className="form-check-label fw-semibold"
                    style={{ color: "#1A2E26" }}
                  >
                    Active
                  </label>
                </div>

                {panelMode === "create" && (
                  <div className="mb-3">
                    <div
                      className="p-3"
                      style={{
                        backgroundColor: "#F5F7F6",
                        border: "1px solid #E0E6E2",
                        borderRadius: "8px",
                      }}
                    >
                      <label
                        htmlFor="admin-form-initial-password"
                        className="form-label fw-semibold"
                        style={{ color: "#1A2E26" }}
                      >
                        Initial Password
                      </label>
                      <input
                        id="admin-form-initial-password"
                        type="text"
                        className="form-control"
                        value={form.initialPassword}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            initialPassword: event.target.value,
                          }))
                        }
                        style={{ borderColor: "#C8D4CE" }}
                      />
                      <div className="form-text mb-0" style={{ color: "#5A6E65" }}>
                        The user must change this password at their next login.
                      </div>
                    </div>
                  </div>
                )}

                <div className="d-grid gap-2 mt-4">
                  <button
                    type="button"
                    className="btn"
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      backgroundColor: "#006B3C",
                      color: "#FFFFFF",
                      border: "none",
                    }}
                  >
                    {saving ? "Saving..." : "Save User"}
                  </button>

                  {panelMode === "edit" && editingUser && (
                    <>
                      <button
                        type="button"
                        className="btn"
                        onClick={handleDeactivateToggle}
                        disabled={saving || isSelf(editingUser)}
                        title={
                          isSelf(editingUser)
                            ? "You cannot deactivate your own account"
                            : undefined
                        }
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: editingUser.isActive ? "#D32F2F" : "#006B3C",
                          border: `1px solid ${
                            editingUser.isActive ? "#D32F2F" : "#006B3C"
                          }`,
                        }}
                      >
                        {editingUser.isActive ? "Deactivate User" : "Activate User"}
                      </button>

                      {isSelf(editingUser) && (
                        <p className="small mb-0" style={{ color: "#5A6E65" }}>
                          You can't deactivate your own account.
                        </p>
                      )}

                      {resetTargetId !== editingUser.id ? (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => openResetPassword(editingUser.id)}
                          style={{ borderColor: "#C8D4CE", color: "#1A2E26" }}
                        >
                          Set New Initial Password
                        </button>
                      ) : (
                        <div
                          className="card mt-2"
                          style={{
                            border: "1px solid #E0E6E2",
                            borderRadius: "8px",
                          }}
                        >
                          <div className="card-body">
                            {resetErrors.length > 0 && (
                              <div
                                className="alert py-2"
                                style={{
                                  color: "#B45309",
                                  backgroundColor: "#FEF3C7",
                                  border: "1px solid #FDE68A",
                                }}
                              >
                                {resetErrors.join(" ")}
                              </div>
                            )}
                            <label
                              htmlFor="admin-reset-password"
                              className="form-label fw-semibold"
                              style={{ color: "#1A2E26" }}
                            >
                              New Initial Password
                            </label>
                            <input
                              id="admin-reset-password"
                              type="text"
                              className="form-control mb-2"
                              value={resetPassword}
                              onChange={(event) =>
                                setResetPassword(event.target.value)
                              }
                              style={{ borderColor: "#C8D4CE" }}
                            />
                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={handleResetPassword}
                                disabled={resetting}
                                style={{
                                  backgroundColor: "#006B3C",
                                  color: "#FFFFFF",
                                  border: "none",
                                }}
                              >
                                {resetting ? "Setting..." : "Set Password"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setResetTargetId(null)}
                                style={{ borderColor: "#C8D4CE", color: "#1A2E26" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closePanel}
                    style={{ borderColor: "#C8D4CE", color: "#1A2E26" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
