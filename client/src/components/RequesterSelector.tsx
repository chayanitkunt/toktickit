import { useState } from "react";
import { useDevelopmentRequester } from "../DevelopmentRequesterContext";
import { checkSystem, SystemStatus } from "../api";

interface RequesterSelectorProps {
  onContinue?: () => void;
}

export default function RequesterSelector({
  onContinue,
}: RequesterSelectorProps) {
  const {
    requesters,
    currentRequester,
    loading,
    error,
    selectRequester,
  } = useDevelopmentRequester();

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [checkingSystem, setCheckingSystem] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  async function handleCheckSystem() {
    setCheckingSystem(true);
    setSystemError(null);
    try {
      const status = await checkSystem();
      setSystemStatus(status);
    } catch (err: any) {
      setSystemError(err.message || "Offline");
      setSystemStatus({ online: false, categories: [] });
    } finally {
      setCheckingSystem(false);
    }
  }

  if (loading) {
    return (
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: "12px" }}
      >
        <div className="card-body p-4">
          <div className="text-muted">
            Loading development requesters…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="alert mb-4"
        style={{
          color: "#D32F2F",
          backgroundColor: "#FDE8E8",
          border: "1px solid #D32F2F",
        }}
      >
        <strong>Unable to load requesters.</strong>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div
      className="card shadow-sm mb-4"
      style={{
        border: "1px solid #E0E6E2",
        borderRadius: "12px",
        backgroundColor: "#FFFFFF",
      }}
    >
      <div className="card-body p-4 p-md-5">
        {/* Top Breadcrumb & Check System */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div
            className="small"
            style={{ color: "#5A6E65" }}
          >
            🏠 &nbsp;›&nbsp; Development Requester Selection
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleCheckSystem}
            disabled={checkingSystem}
          >
            {checkingSystem ? "Checking..." : "Check System"}
          </button>
        </div>


        {/* System Status Display (Lab 01 Requirement) */}
        {systemStatus && (
          <div
            className={`alert ${
              systemStatus.online ? "alert-success" : "alert-danger"
            } mb-4`}
          >
            <div className="fw-bold mb-1">
              System Status: {systemStatus.online ? "Online" : "Offline"}
            </div>

            {systemStatus.categories.length > 0 && (
              <div className="mt-2">
                <div className="small fw-semibold">Available Categories:</div>
                <ul className="mb-0 ps-3 small">
                  {systemStatus.categories.map((cat) => (
                    <li key={cat.id}>{cat.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {!systemStatus.online && systemError && (
              <div className="small mt-1">{systemError}</div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-4">
          <div
            className="d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#EAF6EF",
              fontSize: "1.8rem",
            }}
          >
            👤⚙
          </div>

          <h1
            className="h3 fw-bold mb-2"
            style={{ color: "#1A2E26" }}
          >
            Select Development Requester
          </h1>

          <p
            className="mb-0"
            style={{ color: "#5A6E65" }}
          >
            This is for testing only and is not a login screen.
          </p>
        </div>

        {/* Requester Selector */}
        <div className="mb-4">
          <label
            htmlFor="requester-select"
            className="form-label fw-semibold"
            style={{ color: "#1A2E26" }}
          >
            Development Requester <span style={{ color: "#D32F2F" }}>*</span>
          </label>

          <select
            id="requester-select"
            aria-label="Development Requester"
            className="form-select"
            value={currentRequester?.id ?? ""}
            onChange={(event) => {
              const requester = requesters.find(
                (item) => item.id === Number(event.target.value)
              );

              if (requester) {
                selectRequester(requester);
              }
            }}
            style={{
              borderColor: "#C8D4CE",
              minHeight: "46px",
            }}
          >
            <option value="" disabled>
              Select a requester
            </option>

            {requesters.map((requester) => (
              <option
                key={requester.id}
                value={requester.id}
              >
                {requester.name}
              </option>
            ))}
          </select>
        </div>

        {/* Active Requester Callout */}
        <div
          className="p-3 mb-3"
          style={{
            backgroundColor: "#EAF6EF",
            border: "1px solid #C8E6D3",
            borderRadius: "8px",
            color: "#1A2E26",
          }}
        >
          <div className="fw-semibold mb-1">
            ✓ Active Requester
          </div>

          <div className="small">
            Only active development requesters are shown
            in this selection.
          </div>
        </div>

        {/* Security Callout */}
        <div
          className="p-3 mb-4"
          style={{
            backgroundColor: "#EEF2F0",
            border: "1px solid #D5DDD9",
            borderRadius: "8px",
            color: "#5A6E65",
          }}
        >
          <div className="fw-semibold mb-1">
            🛡 Authentication Notice
          </div>

          <div className="small">
            Real authentication will be enabled in Lab 3.
            This requester selector is provided for Lab 2
            testing only.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary px-4"
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn px-4"
            disabled={!currentRequester}
            onClick={onContinue}
            style={{
              backgroundColor: currentRequester
                ? "#006B3C"
                : "#AAB8B1",
              color: "#FFFFFF",
              border: "none",
            }}
          >
            → Continue
          </button>
        </div>
      </div>
    </div>
  );
}
