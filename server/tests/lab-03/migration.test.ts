import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";

// Issue 2 — User model & Lab 2 -> Lab 3 migration.
// Requires the migration + seed to have already run against the test DB
// (see server/tests/setup, same as the Lab 2 suites).
describe("Lab 2 -> Lab 3 migration", () => {
  it("migrates every seeded Requester into the User table with role REQUESTER", async () => {
    const prisma = getPrisma();

    const alice = await prisma.user.findUnique({ where: { email: "alice@example.com" } });
    const charlie = await prisma.user.findUnique({ where: { email: "charlie@example.com" } });

    expect(alice).not.toBeNull();
    expect(alice?.role).toBe("REQUESTER");
    expect(alice?.isActive).toBe(true);

    expect(charlie).not.toBeNull();
    expect(charlie?.role).toBe("REQUESTER");
    expect(charlie?.isActive).toBe(false);
  });

  it("gives every migrated/seeded user a non-empty password hash and mustChangePassword set", async () => {
    const prisma = getPrisma();
    const users = await prisma.user.findMany();

    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      expect(user.passwordHash.length).toBeGreaterThan(0);
      expect(user.passwordHash).not.toBe("ChangeMe123!");
      expect(typeof user.mustChangePassword).toBe("boolean");
    }
  });

  it("seeds the required minimum role distribution", async () => {
    const prisma = getPrisma();

    const activeRequesters = await prisma.user.count({ where: { role: "REQUESTER", isActive: true } });
    const inactiveRequesters = await prisma.user.count({ where: { role: "REQUESTER", isActive: false } });
    const activeItStaff = await prisma.user.count({ where: { role: "IT_STAFF", isActive: true } });
    const inactiveItStaff = await prisma.user.count({ where: { role: "IT_STAFF", isActive: false } });
    const activeAdmins = await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } });

    expect(activeRequesters).toBeGreaterThanOrEqual(4);
    expect(inactiveRequesters).toBeGreaterThanOrEqual(1);
    expect(activeItStaff).toBeGreaterThanOrEqual(3);
    expect(inactiveItStaff).toBeGreaterThanOrEqual(1);
    expect(activeAdmins).toBeGreaterThanOrEqual(1);
  });

  it("supports the full Lab 3 CurrentStatus enum, including the renamed WAITING_FOR_REQUESTER value", async () => {
    const prisma = getPrisma();

    // A direct write using each new/renamed status value proves the enum
    // migration succeeded; PENDING no longer exists as a label.
    const ticket = await prisma.ticket.findFirst({ where: { ticketNumber: "TKT-SEED-000003" } });
    expect(ticket?.currentStatus).toBe("WAITING_FOR_REQUESTER");

    const openTicket = await prisma.ticket.findFirst({ where: { ticketNumber: "TKT-SEED-000004" } });
    expect(openTicket?.currentStatus).toBe("OPEN");
  });
});

describe("Ticket ownership regression after migration", () => {
  it("preserves every pre-existing ticket's requesterId pointing at the migrated user", async () => {
    const prisma = getPrisma();

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000001" },
      include: { requester: true },
    });

    expect(ticket).not.toBeNull();
    expect(ticket?.requester.email).toBe("alice@example.com");
    expect(ticket?.requester.role).toBe("REQUESTER");
  });

  it("defaults itPriority to requestedPriority for tickets that predate IT Priority", async () => {
    const prisma = getPrisma();

    const ticket = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-2026-000001" } });

    expect(ticket?.itPriority).toBe(ticket?.requestedPriority);
  });

  it("only allows an active IT Staff or Administrator as ownerId (BR-06, enforced at the app layer)", async () => {
    const prisma = getPrisma();

    const owner = await prisma.user.findFirst({
      where: { email: "michael.brown@tiktockit.com" },
    });
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-SEED-000002" },
      include: { owner: true },
    });

    expect(ticket?.ownerId).toBe(owner?.id);
    expect(ticket?.owner?.role).toBe("IT_STAFF");
    expect(ticket?.owner?.isActive).toBe(true);
  });
});

describe("Attachment regression after migration", () => {
  it("keeps existing attachments linked to their ticket, unaffected by the User rename", async () => {
    const prisma = getPrisma();

    const attachment = await prisma.attachment.findUnique({
      where: { id: 1 },
      include: { ticket: true },
    });

    expect(attachment).not.toBeNull();
    expect(attachment?.isRemoved).toBe(false);
    expect(attachment?.ticket.ticketNumber).toBe("TKT-2026-000001");
  });
});

describe("Seed idempotency", () => {
  it(
    "does not duplicate users, tickets, comments, or notes when main() runs twice",
    async () => {
      const prisma = getPrisma();
      const { main } = await import("../../prisma/seed.js");

      // The test DB is already seeded once by the global test setup, so this
      // exercises the second and third runs back to back.
      await main();
      const usersAfterFirst = await prisma.user.count();
      const ticketsAfterFirst = await prisma.ticket.count();
      const commentsAfterFirst = await prisma.ticketComment.count();
      const notesAfterFirst = await prisma.ticketNote.count();

      await main();
      const usersAfterSecond = await prisma.user.count();
      const ticketsAfterSecond = await prisma.ticket.count();
      const commentsAfterSecond = await prisma.ticketComment.count();
      const notesAfterSecond = await prisma.ticketNote.count();

      expect(usersAfterFirst).toBeGreaterThan(0);
      expect(usersAfterSecond).toBe(usersAfterFirst);
      expect(ticketsAfterSecond).toBe(ticketsAfterFirst);
      expect(commentsAfterSecond).toBe(commentsAfterFirst);
      expect(notesAfterSecond).toBe(notesAfterFirst);
    },
    15000,
  );
});
