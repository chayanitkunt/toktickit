import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import RequesterSelector from "./components/RequesterSelector.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");

    try {
      const data = await checkSystem();
      setCategories(data.categories);
      setState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <RequesterSelector />

      <button
        className="btn btn-success mb-4"
        onClick={handleCheck}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading…" : "[ Check System ]"}
      </button>

      {/* State: Loading */}
      {state === "loading" && (
        <div className="text-muted">Loading system information…</div>
      )}

      {/* State: Success */}
      {state === "success" && (
        <div className="card card-body bg-light border-0">
          <p className="mb-2 fs-5">
            <strong>System Status:</strong> <span className="text-success fw-bold">Online</span>
          </p>
          <p className="mb-2 fw-bold">Supported Request Categories:</p>
          <ol className="mb-0 ps-3">
            {categories.map((cat) => (
              <li key={cat.id} className="py-1">
                {cat.name}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* State: Error */}
      {state === "error" && (
        <div className="card card-body bg-light border-danger text-danger">
          <p className="mb-1 fs-5">
            <strong>System Status:</strong> <span className="fw-bold">Offline</span>
          </p>
          <p className="mb-0">{errorMessage || "Unable to connect to TokTickIT API"}</p>
        </div>
      )}
    </div>
  );
}
