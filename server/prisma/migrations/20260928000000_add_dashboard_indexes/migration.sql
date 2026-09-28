-- Lab 4 dashboards aggregate live Ticket data by requester/owner, status,
-- priority, and most-recent update. These additive indexes preserve all
-- earlier data while keeping bounded dashboard queries index-friendly.
CREATE INDEX "Ticket_requesterId_currentStatus_idx" ON "Ticket"("requesterId", "currentStatus");
CREATE INDEX "Ticket_requesterId_updatedAt_idx" ON "Ticket"("requesterId", "updatedAt");
CREATE INDEX "Ticket_ownerId_currentStatus_idx" ON "Ticket"("ownerId", "currentStatus");
CREATE INDEX "Ticket_ownerId_updatedAt_idx" ON "Ticket"("ownerId", "updatedAt");
CREATE INDEX "Ticket_currentStatus_itPriority_idx" ON "Ticket"("currentStatus", "itPriority");
