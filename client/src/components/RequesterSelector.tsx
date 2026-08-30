import { useDevelopmentRequester } from "../DevelopmentRequesterContext";

export default function RequesterSelector() {
  const {
    requesters,
    currentRequester,
    loading,
    error,
    selectRequester,
  } = useDevelopmentRequester();

  if (loading) {
    return (
      <div className="mb-4">
        <label className="form-label fw-bold">
          Development Requester
        </label>
        <div className="text-muted">
          Loading requesters…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger mb-4">
        <strong>Unable to load requesters.</strong>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label htmlFor="requester-select" className="form-label fw-bold">
        Development Requester
      </label>

      <select
        id="requester-select"
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
      >
        <option value="" disabled>
          Select a requester
        </option>

        {requesters.map((requester) => (
          <option key={requester.id} value={requester.id}>
            {requester.name} ({requester.email})
          </option>
        ))}
      </select>

      {currentRequester && (
        <div className="form-text">
          Current requester:{" "}
          <strong>{currentRequester.name}</strong>
        </div>
      )}
    </div>
  );
}
