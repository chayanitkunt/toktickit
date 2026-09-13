-- Lab 3, Issue 2: User model & Lab 2 -> Lab 3 data migration.
--
-- This migration evolves the Lab 2 `Requester` table into the Lab 3 `User`
-- table IN PLACE (rename, not copy), so every existing foreign key
-- (Ticket.requesterId) keeps pointing at the same row ids automatically.
-- No Ticket or Attachment data is touched or lost.
--
-- Migrated Requesters receive a documented local-development initial
-- password of "ChangeMe123!" (mustChangePassword = true), hashed with
-- Postgres' pgcrypto bcrypt implementation so the resulting hash is
-- byte-for-byte compatible with the Node "bcrypt" package used at runtime.
-- This is a fake, local-only credential — see server/README.md.

-- 0. bcrypt-compatible hashing inside SQL.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. New Role enum for the three Lab 3 roles.
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- 2. Rename Requester -> User. Existing rows, ids, and the
--    Ticket_requesterId_fkey constraint are preserved automatically.
ALTER TABLE "Requester" RENAME TO "User";

-- 3. Add the new User columns as nullable first, backfill, then lock them down.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "role" "Role";
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "User" SET "role" = 'REQUESTER' WHERE "role" IS NULL;
UPDATE "User"
SET "passwordHash" = crypt('ChangeMe123!', gen_salt('bf', 10))
WHERE "passwordHash" IS NULL;

ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

CREATE INDEX "User_role_idx" ON "User"("role");

-- 4. Ticket: ownership, IT Priority, and the Requester "looks resolved" flag.
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "itPriority" "RequestedPriority";
ALTER TABLE "Ticket" ADD COLUMN "problemAppearsResolved" BOOLEAN NOT NULL DEFAULT false;

-- BR-07: IT Priority initially copies Requested Priority for every existing ticket.
UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id");

CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");
CREATE INDEX "Ticket_currentStatus_idx" ON "Ticket"("currentStatus");

-- 5. CurrentStatus: rename PENDING -> WAITING_FOR_REQUESTER (label only, no
--    data change — existing rows keep referring to the same enum value),
--    then add the three new Lab 3 statuses.
ALTER TYPE "CurrentStatus" RENAME VALUE 'PENDING' TO 'WAITING_FOR_REQUESTER';
ALTER TYPE "CurrentStatus" ADD VALUE IF NOT EXISTS 'OPEN' BEFORE 'IN_PROGRESS';
ALTER TYPE "CurrentStatus" ADD VALUE IF NOT EXISTS 'REOPENED' AFTER 'CLOSED';
ALTER TYPE "CurrentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED' AFTER 'REOPENED';

-- 6. Public Comments and Internal Notes (BR-04), append-only in Lab 3.
CREATE TABLE "TicketComment" (
    "id" SERIAL PRIMARY KEY,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id"),
    CONSTRAINT "TicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id")
);
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

CREATE TABLE "TicketNote" (
    "id" SERIAL PRIMARY KEY,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id"),
    CONSTRAINT "TicketNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id")
);
CREATE INDEX "TicketNote_ticketId_idx" ON "TicketNote"("ticketId");
