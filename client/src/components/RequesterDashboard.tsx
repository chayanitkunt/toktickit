import { useCallback, useEffect, useState } from "react";
import {
  getRequesterDashboard,
  type CurrentStatus,
  type DashboardTicket,
  type RequesterDashboardData,
} from "../api";
import TicketStatusBadge from "./TicketStatusBadge";

interface Props {
  name: string;
  onOpenTicket: (id: number) => void;
  onViewTickets: (statuses?: CurrentStatus[]) => void;
  onCreateTicket: () => void;
}

const OPEN_TICKET_STATUSES: CurrentStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "REOPENED"];

function TicketList({ tickets, onOpenTicket }: { tickets: DashboardTicket[]; onOpenTicket: (id: number) => void }) {
  return <ul className="list-group list-group-flush">{tickets.map((ticket) => <li key={ticket.id} className="list-group-item px-0 py-3">
    <div className="row align-items-center g-2">
      <div className="col-12 col-md-6">
        <button type="button" className="btn btn-link p-0 text-start fw-semibold" style={{ color: "#166534" }} onClick={() => onOpenTicket(ticket.id)}>{ticket.ticketNumber}</button>
        <div className="small text-truncate">{ticket.summary}</div>
      </div>
      <div className="col-7 col-md-3"><TicketStatusBadge status={ticket.currentStatus} /></div>
      <div className="col-5 col-md-3 small text-muted text-md-end">{new Date(ticket.updatedAt).toLocaleString()}</div>
    </div>
  </li>)}</ul>;
}

export default function RequesterDashboard({ name, onOpenTicket, onViewTickets, onCreateTicket }: Props) {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try { setLoading(true); setFailed(false); setData(await getRequesterDashboard()); }
    catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cards: { label: string; value: number; statuses?: CurrentStatus[] }[] = data ? [
    { label: "My Open Tickets", value: data.myOpenTickets, statuses: OPEN_TICKET_STATUSES },
    { label: "Waiting for Requester", value: data.waitingForRequester, statuses: ["WAITING_FOR_REQUESTER"] },
    { label: "Resolved", value: data.resolved, statuses: ["RESOLVED"] },
    { label: "Closed", value: data.closed, statuses: ["CLOSED"] },
  ] : [];

  return <section aria-labelledby="requester-dashboard-heading">
    <div className="mb-4">
      <h2 id="requester-dashboard-heading" className="h3 fw-bold mb-1" style={{ color: "#14231C" }}>Welcome, {name.split(" ")[0]}!</h2>
      <p className="mb-0 text-muted">Here&apos;s the latest on your requests.</p>
    </div>

    {failed && <div className="alert alert-danger" role="alert">We could not load your dashboard. <button type="button" className="btn btn-link p-0" onClick={load}>Try again</button></div>}

    {loading ? <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3" aria-label="Loading dashboard">{[1, 2, 3, 4].map((key) => <div key={key} className="col"><div className="card shadow-sm placeholder-glow"><div className="card-body p-4"><span className="placeholder col-8" /><span className="placeholder col-4 d-block mt-4" /></div></div></div>)}</div> : data && <>
      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3 mb-4">{cards.map((card) => <div key={card.label} className="col">
        <button type="button" className="card dashboard-card w-100 h-100 text-start shadow-sm" aria-label={`${card.label}: ${card.value}. View all Tickets`} onClick={() => onViewTickets(card.statuses)}>
          <div className="card-body p-4"><div className="fw-medium mb-4" style={{ color: "#14231C" }}>{card.label}</div><div className="display-5 fw-semibold mb-3" style={{ color: "#14231C" }}>{card.value}</div><span className="small" style={{ color: "#166534" }}>View all →</span></div>
        </button>
      </div>)}</div>

      {data.recentlyUpdatedTickets.length === 0 ? <div className="alert alert-light border">No Tickets yet. <button type="button" className="btn btn-link p-0" onClick={onCreateTicket}>Create your first Ticket</button></div> : <div className="row g-4">
        <div className="col-12 col-lg-7"><div className="card shadow-sm h-100"><div className="card-body p-0">
          <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom"><h3 className="h5 mb-0">My Recent Tickets</h3><button type="button" className="btn btn-link p-0" style={{ color: "#166534" }} onClick={() => onViewTickets()}>View all</button></div>
          <div className="px-4"><TicketList tickets={data.recentlyUpdatedTickets} onOpenTicket={onOpenTicket} /></div>
        </div></div></div>
        <div className="col-12 col-lg-5"><div className="card shadow-sm"><div className="card-body p-4"><h3 className="h5 mb-4">Quick Actions</h3><div className="d-grid gap-3">
          <button type="button" className="requester-quick-action" onClick={onCreateTicket}><span className="requester-quick-action-icon" aria-hidden="true">＋</span><span><strong>Create Ticket</strong><small>Submit a new request</small></span></button>
          <button type="button" className="requester-quick-action" onClick={() => onViewTickets()}><span className="requester-quick-action-icon" aria-hidden="true">▣</span><span><strong>View My Tickets</strong><small>Track existing requests</small></span></button>
        </div></div></div></div>
      </div>}
    </>}
  </section>;
}
