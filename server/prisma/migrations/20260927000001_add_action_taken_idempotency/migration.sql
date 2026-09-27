-- Durable retry protection for POST Actions Taken. PostgreSQL permits
-- multiple NULL values, so clients that do not supply a key retain the
-- documented request shape while keyed retries are deduplicated.
ALTER TABLE "ActionTaken" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "ActionTaken_ticketId_performedById_idempotencyKey_key"
  ON "ActionTaken"("ticketId", "performedById", "idempotencyKey");
