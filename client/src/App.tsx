import { useState } from "react";
import CreateTicket from "./components/CreateTicket";
import MyTickets from "./components/MyTickets";
import RequesterSelector from "./components/RequesterSelector";
import TicketDetail from "./components/TicketDetail";
import { useDevelopmentRequester } from "./DevelopmentRequesterContext";

type Screen =
  | "requester"
  | "tickets"
  | "create"
  | "detail";

export default function App() {
  const { currentRequester } = useDevelopmentRequester();

  const [screen, setScreen] = useState<Screen>(
    currentRequester ? "tickets" : "requester"
  );

  const [selectedTicketId, setSelectedTicketId] =
    useState<number | null>(null);

  function handleRequesterContinue() {
    if (currentRequester) {
      setScreen("tickets");
    }
  }

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

  function handleChangeRequester() {
    setScreen("requester");
  }

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

              {/* Main Navigation */}
              {currentRequester && screen !== "requester" && (
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
            </div>

            {/* Right: Requester Identity */}
            {currentRequester && screen !== "requester" && (
              <button
                type="button"
                onClick={handleChangeRequester}
                className="btn btn-sm text-white border-white-50 ms-auto"
                style={{
                  whiteSpace: "nowrap",
                }}
              >
                {currentRequester.name}
              </button>
            )}
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
        {screen === "requester" && (
          <RequesterSelector
            onContinue={handleRequesterContinue}
          />
        )}

        {screen === "tickets" && currentRequester && (
          <MyTickets
            onCreateTicket={handleCreateTicket}
            onOpenTicket={handleOpenTicket}
          />
        )}

       {screen === "create" && currentRequester && (
          <CreateTicket
            requesterId={currentRequester.id}
            onCancel={handleBackToTickets}
            onCreated={handleTicketCreated}
          />
        )}

        {screen === "detail" &&
          currentRequester &&
          selectedTicketId !== null && (
            <TicketDetail
              ticketId={selectedTicketId}
              requesterId={currentRequester.id}
              onBack={handleBackToTickets}
            />
          )}
      </main>
    </div>
  );
}
