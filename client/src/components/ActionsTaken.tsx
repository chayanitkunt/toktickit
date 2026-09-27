import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  createActionTaken,
  getActionsTaken,
  updateActionTaken,
  type ActionTaken,
  type ActionTakenInput,
} from "../api";

interface ActionsTakenProps {
  ticketId: number;
  canEdit: boolean;
  onActionsChanged?: (count: number) => void;
}

type FormValues = {
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
};

const emptyForm = (): FormValues => ({
  description: "",
  result: "",
  followUpRequired: false,
  followUpNote: "",
  attachmentNotes: "",
});

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function inputFromForm(form: FormValues): ActionTakenInput {
  return {
    description: form.description.trim(),
    result: form.result.trim(),
    followUpRequired: form.followUpRequired,
    followUpNote: form.followUpRequired ? form.followUpNote.trim() : "",
    attachmentNotes: form.attachmentNotes.trim(),
  };
}

function errorsFor(form: FormValues) {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!form.description.trim()) errors.description = "Action Description is required.";
  if (!form.result.trim()) errors.result = "Result is required.";
  if (form.followUpRequired && !form.followUpNote.trim()) {
    errors.followUpNote = "Follow-up Note is required when follow-up is needed.";
  }
  return errors;
}

function FollowUpBadge({ required }: { required: boolean }) {
  return (
    <span className={`badge ${required ? "text-bg-warning" : "text-bg-secondary"}`}>
      {required ? "Yes — see note" : "No"}
    </span>
  );
}

function ActionForm({
  initial,
  action,
  editing,
  submitting,
  serverError,
  onCancel,
  onSubmit,
}: {
  initial: FormValues;
  action?: ActionTaken;
  editing: boolean;
  submitting: boolean;
  serverError: string;
  onCancel: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = errorsFor(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit(form);
  }

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <form onSubmit={submit} noValidate className="border rounded p-3 mt-3" style={{ borderColor: "#C9D8D0" }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="h6 fw-bold mb-0" style={{ color: "#1A2E26" }}>
          {editing ? "Edit Action Taken" : "Add Action Taken"}
        </h3>
        <span className="small text-muted">{action ? "Audit fields are read-only." : "Action Date/Time and Performed By will be recorded automatically."}</span>
      </div>
      {serverError && <div className="alert alert-danger py-2" role="alert">{serverError}</div>}
      {action && <div className="row g-2 mb-3" aria-label="Immutable audit fields">
        <div className="col-12 col-md-6"><label className="form-label fw-semibold" htmlFor="action-at-readonly">Action Date/Time</label><input id="action-at-readonly" className="form-control" value={formatDate(action.actionAt)} readOnly /></div>
        <div className="col-12 col-md-6"><label className="form-label fw-semibold" htmlFor="performed-by-readonly">Performed By</label><input id="performed-by-readonly" className="form-control" value={action.performedBy.name} readOnly /></div>
      </div>}
      <div className="mb-3">
        <label htmlFor="action-description" className="form-label fw-semibold">Action Description</label>
        <textarea id="action-description" className={`form-control ${errors.description ? "is-invalid" : ""}`} rows={3} maxLength={2000} value={form.description} onChange={(event) => set("description", event.target.value)} aria-describedby="action-description-help action-description-error" />
        <div id="action-description-help" className="form-text">{form.description.length}/2000</div>
        {errors.description && <div id="action-description-error" className="invalid-feedback">{errors.description}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="action-result" className="form-label fw-semibold">Result</label>
        <textarea id="action-result" className={`form-control ${errors.result ? "is-invalid" : ""}`} rows={3} maxLength={2000} value={form.result} onChange={(event) => set("result", event.target.value)} aria-describedby="action-result-error" />
        {errors.result && <div id="action-result-error" className="invalid-feedback">{errors.result}</div>}
      </div>
      <fieldset className="mb-3">
        <legend className="col-form-label pt-0 fw-semibold">Follow-Up Required?</legend>
        <div className="d-flex gap-3">
          <div className="form-check"><input id="follow-up-no" className="form-check-input" type="radio" checked={!form.followUpRequired} onChange={() => { set("followUpRequired", false); set("followUpNote", ""); }} /><label className="form-check-label" htmlFor="follow-up-no">No</label></div>
          <div className="form-check"><input id="follow-up-yes" className="form-check-input" type="radio" checked={form.followUpRequired} onChange={() => set("followUpRequired", true)} /><label className="form-check-label" htmlFor="follow-up-yes">Yes</label></div>
        </div>
      </fieldset>
      {form.followUpRequired && <div className="mb-3">
        <label htmlFor="follow-up-note" className="form-label fw-semibold">Follow-up Note</label>
        <textarea id="follow-up-note" className={`form-control ${errors.followUpNote ? "is-invalid" : ""}`} rows={2} maxLength={2000} value={form.followUpNote} onChange={(event) => set("followUpNote", event.target.value)} aria-describedby="follow-up-note-error" />
        {errors.followUpNote && <div id="follow-up-note-error" className="invalid-feedback">{errors.followUpNote}</div>}
      </div>}
      <div className="mb-3">
        <label htmlFor="attachment-notes" className="form-label fw-semibold">Attachment Notes <span className="fw-normal text-muted">(optional)</span></label>
        <input id="attachment-notes" className="form-control" maxLength={2000} value={form.attachmentNotes} onChange={(event) => set("attachmentNotes", event.target.value)} />
        <div className="form-text">e.g. IMG_0231.jpg on shared drive</div>
      </div>
      <div className="d-flex gap-2 flex-wrap">
        <button type="submit" className="btn" disabled={submitting} style={{ backgroundColor: "#006B3C", color: "#FFF" }}>
          {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}{editing ? "Save Action Taken" : "Add Action Taken"}
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function ActionsTaken({ ticketId, canEdit, onActionsChanged }: ActionsTakenProps) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ActionTaken | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const nextActions = await getActionsTaken(ticketId);
      setActions(nextActions);
      onActionsChanged?.(nextActions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Actions Taken.");
    } finally { setLoading(false); }
  }, [ticketId, onActionsChanged]);

  useEffect(() => { load(); }, [load]);

  async function create(values: FormValues) {
    try {
      setSubmitting(true); setFormError("");
      const created = await createActionTaken(ticketId, inputFromForm(values), idempotencyKey);
      setActions((previous) => [...previous.filter((action) => action.id !== created.id), created].sort((a, b) => a.actionAt.localeCompare(b.actionAt)));
      onActionsChanged?.(actions.length + (actions.some((action) => action.id === created.id) ? 0 : 1));
      setShowCreate(false); setIdempotencyKey(crypto.randomUUID());
    } catch (err) { setFormError(err instanceof Error ? err.message : "Unable to add Action Taken."); }
    finally { setSubmitting(false); }
  }

  async function save(values: FormValues) {
    if (!editing) return;
    try {
      setSubmitting(true); setFormError(""); setConflict("");
      const updated = await updateActionTaken(ticketId, editing.id, { ...inputFromForm(values), expectedUpdatedAt: editing.updatedAt });
      setActions((previous) => previous.map((action) => action.id === updated.id ? updated : action));
      setEditing(null);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setConflict("This action was updated by someone else. Reload to see the latest version before editing.");
      } else setFormError(err instanceof Error ? err.message : "Unable to save Action Taken.");
    } finally { setSubmitting(false); }
  }

  const toForm = (action: ActionTaken): FormValues => ({ description: action.description, result: action.result, followUpRequired: action.followUpRequired, followUpNote: action.followUpNote ?? "", attachmentNotes: action.attachmentNotes ?? "" });
  const actionRows = (compact: boolean) => actions.map((action) => compact ? (
    <article key={action.id} className="border rounded p-3 mb-2" style={{ borderColor: "#E0E6E2" }}>
      <div className="d-flex justify-content-between gap-2 mb-2"><strong>Action Taken</strong>{canEdit && <button type="button" className="btn btn-sm btn-outline-success" onClick={() => { setEditing(action); setShowCreate(false); setFormError(""); }}>Edit</button>}</div>
      <dl className="mb-0 small"><dt>Action Date/Time</dt><dd>{formatDate(action.actionAt)}</dd><dt>Description</dt><dd style={{ whiteSpace: "pre-wrap" }}>{action.description}</dd><dt>Result</dt><dd style={{ whiteSpace: "pre-wrap" }}>{action.result}</dd><dt>Performed By</dt><dd>{action.performedBy.name}</dd><dt>Follow-Up</dt><dd><FollowUpBadge required={action.followUpRequired} />{action.followUpRequired && action.followUpNote && <span className="d-block mt-1">{action.followUpNote}</span>}</dd><dt>Attachment Notes</dt><dd>{action.attachmentNotes || "—"}</dd></dl>
    </article>
  ) : (
    <tr key={action.id}><td>{formatDate(action.actionAt)}</td><td style={{ whiteSpace: "pre-wrap" }}>{action.description}</td><td style={{ whiteSpace: "pre-wrap" }}>{action.result}</td><td>{action.performedBy.name}</td><td><FollowUpBadge required={action.followUpRequired} />{action.followUpRequired && action.followUpNote && <div className="small mt-1">{action.followUpNote}</div>}</td><td>{action.attachmentNotes || "—"}</td>{canEdit && <td><button type="button" className="btn btn-sm btn-outline-success" onClick={() => { setEditing(action); setShowCreate(false); setFormError(""); }}>Edit</button></td>}</tr>
  ));

  return <section aria-labelledby="actions-taken-heading">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3"><h2 id="actions-taken-heading" className="h5 fw-bold mb-0">Actions Taken ({actions.length})</h2>{canEdit && actions.length > 0 && <button type="button" className="btn btn-sm" onClick={() => { setShowCreate(true); setEditing(null); setFormError(""); }} style={{ backgroundColor: "#006B3C", color: "#FFF" }}>+ Add Action Taken</button>}</div>
    {conflict && <div className="alert alert-warning py-2" role="alert">{conflict} <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={load}>Reload</button></div>}
    {loading ? <div className="text-center py-3"><div className="spinner-border spinner-border-sm" role="status"><span className="visually-hidden">Loading Actions Taken...</span></div></div> : error ? <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-link p-0 ms-1" onClick={load}>Retry</button></div> : actions.length === 0 ? <div className="text-muted border rounded p-3">No Actions Taken recorded yet.{canEdit && <button type="button" className="btn btn-link p-0 ms-2" onClick={() => setShowCreate(true)}>+ Add Action Taken</button>}</div> : <><div className="table-responsive d-none d-lg-block"><table className="table align-middle"><thead><tr><th>Action Date/Time</th><th>Description</th><th>Result</th><th>Performed By</th><th>Follow-Up</th><th>Attachment Notes</th>{canEdit && <th><span className="visually-hidden">Actions</span></th>}</tr></thead><tbody>{actionRows(false)}</tbody></table></div><div className="d-lg-none">{actionRows(true)}</div></>}
    {showCreate && <ActionForm key="create" initial={emptyForm()} editing={false} submitting={submitting} serverError={formError} onCancel={() => { setShowCreate(false); setFormError(""); }} onSubmit={create} />}
    {editing && <ActionForm key={editing.id} initial={toForm(editing)} action={editing} editing submitting={submitting} serverError={formError} onCancel={() => { setEditing(null); setFormError(""); }} onSubmit={save} />}
  </section>;
}
