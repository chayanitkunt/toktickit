import { useState } from "react";
import CreateTicket from "./components/CreateTicket";
import MyTickets from "./components/MyTickets";
import TicketDetail from "./components/TicketDetail";
import Login from "./components/Login";
import ChangePassword from "./components/ChangePassword";
import StaffTicketQueue from "./components/StaffTicketQueue";
import StaffTicketDetail from "./components/StaffTicketDetail";
import { useAuth } from "./AuthContext";

type Screen = "tickets" | "create" | "detail" | "queue" | "staff-detail";

const ROLE_LABELS: Record<string, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Support",
  ADMINISTRATOR: "Administrator",
};

function AuthenticatedShell() {
  const { user, logout } = useAuth();

  const isRequester = user?.role === "REQUESTER";
  const isStaffOrAdmin =
    user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";

  const [screen, setScreen] = useState<Screen>(
    isStaffOrAdmin ? "queue" : "tickets"
  );
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(
    null
  );

  function handleCreateTicket() {
    setScreen("create");
  }

  function handleTicketCreated() {
    setScreen("tickets");
  }

  function handleOpenTicket(ticketId: number) {
    setSelectedTicketId(ticketId);
    setScreen("detail");
  }

  function handleBackToTickets() {
    setSelectedTicketId(null);
    setScreen("tickets");
  }

  // Issue 5 — IT Staff Ticket Queue (GitHub Issue #32)
  function handleOpenStaffTicket(ticketId: number) {
    setSelectedTicketId(ticketId);
    setScreen("staff-detail");
  }

  function handleBackToQueue() {
    setSelectedTicketId(null);
    setScreen("queue");
  }

  async function handleLogout() {
    await logout();
  }

  // Issue 5: Administrator user management is still a later issue — for now,
  // an Administrator sees the same IT Staff Ticket Queue nav destination
  // (specification.md §5.2 permits Administrators to perform IT Staff
  // ticket operations).

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F5F7F6",
        color: "#1A2E26",
      }}
    >
      {/* Global Header */}
      <header
        style={{
          backgroundColor: "#006B3C",
          color: "#FFFFFF",
        }}
      >
        <div
          className="container-fluid px-3 px-md-4"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <div
            className="d-flex flex-wrap align-items-center justify-content-between py-2 gap-2"
            style={{ minHeight: "64px" }}
          >
            {/* Left: Logo + Navigation */}
            <div className="d-flex align-items-center gap-3">
              {/* Logo */}
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: "1.5rem" }}>◷</span>
                <h1
                  className="fw-bold mb-0 text-white"
                  style={{ fontSize: "1.25rem" }}
                >
                  TokTickIT
                </h1>
              </div>

              {/* Main Navigation — Requester only for now (see isRequester) */}
              {isRequester && (
                <nav
                  className="d-flex align-items-center gap-1 ms-2 ms-md-3"
                  aria-label="Main navigation"
                >
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setScreen("tickets")}
                    style={{
                      color: "#FFFFFF",
                      border: "none",
                      backgroundColor:
                        screen === "tickets"
                          ? "#0B7A46"
                          : "transparent",
                    }}
                  >
                    My Tickets
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleCreateTicket}
                    style={{
                      color: "#FFFFFF",
                      border: "none",
                      backgroundColor:
                        screen === "create"
                          ? "#0B7A46"
                          : "transparent",
                    }}
                  >
                    + Create Ticket
                  </button>
                </nav>
              )}

              {/* Main Navigation — IT Staff / Administrator (Issue 5) */}
              {isStaffOrAdmin && (
                <nav
                  className="d-flex align-items-center gap-1 ms-2 ms-md-3"
                  aria-label="Main navigation"
                >
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleBackToQueue}
                    style={{
                      color: "#FFFFFF",
                      border: "none",
                      backgroundColor:
                        screen === "queue" || screen === "staff-detail"
                          ? "#0B7A46"
                          : "transparent",
                    }}
                  >
                    My Queue
                  </button>
                </nav>
              )}
            </div>

            {/* Right: Authenticated identity + role + logout */}
            <div className="d-flex align-items-center gap-2 ms-auto">
              {user && (
                <div
                  className="d-flex align-items-center gap-2"
                  data-testid="current-user-identity"
                >
                  <span
                    className="text-white small text-end"
                    style={{ lineHeight: 1.1 }}
                  >
                    <span className="fw-semibold d-block">{user.name}</span>
                    <span
                      className="badge"
                      style={{ backgroundColor: "#0B7A46" }}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="container py-4"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {!isRequester && !isStaffOrAdmin && (
          <div
            className="alert mb-0"
            style={{
              color: "#0369A1",
              backgroundColor: "#E0F2FE",
              border: "1px solid #7DD3FC",
              borderRadius: "8px",
            }}
          >
            This role's screens are not part of this Lab 3 increment yet.
          </div>
        )}

        {isStaffOrAdmin && screen === "queue" && (
          <StaffTicketQueue onOpenTicket={handleOpenStaffTicket} />
        )}

        {isStaffOrAdmin &&
          screen === "staff-detail" &&
          selectedTicketId !== null && (
            <StaffTicketDetail
              ticketId={selectedTicketId}
              onBack={handleBackToQueue}
            />
          )}

        {isRequester && screen === "tickets" && (
          <MyTickets
            onCreateTicket={handleCreateTicket}
            onOpenTicket={handleOpenTicket}
          />
        )}

        {isRequester && screen === "create" && (
          <CreateTicket
            onCancel={handleBackToTickets}
            onCreated={handleTicketCreated}
          />
        )}

        {isRequester && screen === "detail" && selectedTicketId !== null && (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={handleBackToTickets}
          />
        )}
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}
    >
      <div className="spinner-border" style={{ color: "#006B3C" }} role="status">
        <span className="visually-hidden">Loading…</span>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  return <AuthenticatedShell />;
}

