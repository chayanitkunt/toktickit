import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// Issue 12 (Lab 2) — seed Development Requesters.
// Issue 13 (Lab 2) — seed Related Systems.
// Lab 3, Issue 2 — seed real Users (Requester/IT Staff/Administrator),
// ticket ownership/IT Priority, and sample Public Comments/Internal Notes.
//
// All seeded accounts share one fake, local-development-only password:
// "ChangeMe123!" (mustChangePassword = true for everyone except the
// Administrator, so grading can log straight into /admin/users).
// This is NOT a real credential and must never be reused outside this lab.
const SEED_PASSWORD = "ChangeMe123!";

export async function main() {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const categories = ["Account and Access", "Hardware", "Software", "Network"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];
  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  // ---------------------------------------------------------------------
  // Users: 4 active + 1 inactive Requester, 3 active + 1 inactive IT Staff,
  // 1 active Administrator. Requesters keep the same emails as Lab 2 so
  // existing local dev data lines up with the migrated User rows.
  // ---------------------------------------------------------------------
  const users = [
    { name: "Alice Johnson", email: "alice@example.com", role: "REQUESTER" as const, isActive: true },
    { name: "Bob Smith", email: "bob@example.com", role: "REQUESTER" as const, isActive: true },
    { name: "Charlie Brown", email: "charlie@example.com", role: "REQUESTER" as const, isActive: false },
    { name: "Diana Prince", email: "diana@example.com", role: "REQUESTER" as const, isActive: true },
    { name: "Ethan Hunt", email: "ethan@example.com", role: "REQUESTER" as const, isActive: true },
    { name: "Michael Brown", email: "michael.brown@tiktockit.com", role: "IT_STAFF" as const, isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@tiktockit.com", role: "IT_STAFF" as const, isActive: true },
    { name: "David Lee", email: "david.lee@tiktockit.com", role: "IT_STAFF" as const, isActive: true },
    { name: "Kevin Patel", email: "kevin.patel@tiktockit.com", role: "IT_STAFF" as const, isActive: false },
    { name: "Jennifer Anderson", email: "jennifer.anderson@tiktockit.com", role: "ADMINISTRATOR" as const, isActive: true },
  ];

  for (const u of users) {
    // The seeded Administrator doesn't need to change password on first
    // login, so a fresh checkout can exercise /admin/users immediately;
    // everyone else follows the normal Lab 3 flow.
    const mustChangePassword = u.role !== "ADMINISTRATOR";

    await prisma.user.upsert({
      where: { email: u.email },
      // IMPORTANT: also reset passwordHash/mustChangePassword on update,
      // not just on create. The auth test suites (both vitest and the e2e
      // spec) log in as these seeded accounts and change their passwords
      // as part of exercising AC-02. Without resetting credentials here,
      // re-running `npm run prisma:seed` would silently leave a test's
      // leftover password/mustChangePassword state in place, breaking the
      // NEXT test run that expects the original seeded credentials —
      // exactly what happened when the vitest suite ran before the e2e
      // suite. Re-seeding must fully restore the known baseline.
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        passwordHash,
        mustChangePassword,
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        passwordHash,
        mustChangePassword,
      },
    });
  }

  const byEmail = async (email: string) =>
    prisma.user.findUniqueOrThrow({ where: { email } });

  const alice = await byEmail("alice@example.com");
  const bob = await byEmail("bob@example.com");
  const diana = await byEmail("diana@example.com");
  const michael = await byEmail("michael.brown@tiktockit.com");
  const sarah = await byEmail("sarah.johnson@tiktockit.com");
  const david = await byEmail("david.lee@tiktockit.com");

  const hardware = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const network = await prisma.category.findUniqueOrThrow({ where: { name: "Network" } });
  const software = await prisma.category.findUniqueOrThrow({ where: { name: "Software" } });
  const corporateLaptop = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Corporate Laptop" } });
  const vpn = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "VPN" } });
  const email = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Email" } });

  // ---------------------------------------------------------------------
  // Tickets: distributed across Requesters, statuses, priorities, and
  // assigned/unassigned ownership. Ticket #1 is preserved from Lab 2 for
  // the existing attachment-download test.
  // ---------------------------------------------------------------------
  const ticket1 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2026-000001" },
    update: {},
    create: {
      ticketNumber: "TKT-2026-000001",
      requesterId: alice.id,
      categoryId: hardware.id,
      relatedSystemId: corporateLaptop.id,
      summary: "Seeded attachment test ticket",
      description: "Ticket used to test attachment download functionality.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "NEW",
    },
  });

  const ticket2 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-SEED-000002" },
    update: {
      requesterId: bob.id,
      ownerId: michael.id,
      categoryId: network.id,
      relatedSystemId: vpn.id,
      summary: "Cannot connect to VPN",
      description: "VPN client fails to authenticate from home network.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
    },
    create: {
      ticketNumber: "TKT-SEED-000002",
      requesterId: bob.id,
      ownerId: michael.id,
      categoryId: network.id,
      relatedSystemId: vpn.id,
      summary: "Cannot connect to VPN",
      description: "VPN client fails to authenticate from home network.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
    },
  });

  const ticket3 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-SEED-000003" },
    update: {
      requesterId: diana.id,
      ownerId: sarah.id,
      categoryId: software.id,
      relatedSystemId: email.id,
      summary: "Email not syncing on mobile",
      description: "Mail app on phone stopped syncing after the last update.",
      requestedPriority: "MEDIUM",
      itPriority: "LOW",
      currentStatus: "WAITING_FOR_REQUESTER",
    },
    create: {
      ticketNumber: "TKT-SEED-000003",
      requesterId: diana.id,
      ownerId: sarah.id,
      categoryId: software.id,
      relatedSystemId: email.id,
      summary: "Email not syncing on mobile",
      description: "Mail app on phone stopped syncing after the last update.",
      requestedPriority: "MEDIUM",
      itPriority: "LOW",
      currentStatus: "WAITING_FOR_REQUESTER",
    },
  });

  const ticket4 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-SEED-000004" },
    update: {
      requesterId: alice.id,
      ownerId: null,
      categoryId: hardware.id,
      relatedSystemId: corporateLaptop.id,
      summary: "Docking station not detected",
      description: "Laptop no longer detects the docking station at the desk.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "OPEN",
      problemAppearsResolved: false,
    },
    create: {
      ticketNumber: "TKT-SEED-000004",
      requesterId: alice.id,
      // Unassigned on purpose: exercises the "claim" flow in the queue.
      categoryId: hardware.id,
      relatedSystemId: corporateLaptop.id,
      summary: "Docking station not detected",
      description: "Laptop no longer detects the docking station at the desk.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "OPEN",
      problemAppearsResolved: false,
    },
  });

  const ticket5 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-SEED-000005" },
    update: {
      requesterId: bob.id,
      ownerId: david.id,
      categoryId: software.id,
      relatedSystemId: email.id,
      summary: "Printer keeps showing offline",
      description: "Shared office printer intermittently shows offline in the driver list.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "RESOLVED",
      problemAppearsResolved: true,
    },
    create: {
      ticketNumber: "TKT-SEED-000005",
      requesterId: bob.id,
      ownerId: david.id,
      categoryId: software.id,
      relatedSystemId: email.id,
      summary: "Printer keeps showing offline",
      description: "Shared office printer intermittently shows offline in the driver list.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "RESOLVED",
      problemAppearsResolved: true,
    },
  });

  // ---------------------------------------------------------------------
  // Public Comments and Internal Notes — sample, non-sensitive content.
  // Append-only in Lab 3, so upsert is done by a stable synthetic id.
  // ---------------------------------------------------------------------
  await prisma.ticketComment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      ticketId: ticket2.id,
      authorId: michael.id,
      content: "We are investigating the issue on your device. We'll update you shortly.",
    },
  });
  await prisma.ticketComment.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      ticketId: ticket2.id,
      authorId: bob.id,
      content: "Thanks — please let me know if you need anything else from me.",
    },
  });

  await prisma.ticketNote.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      ticketId: ticket2.id,
      authorId: michael.id,
      content: "Checked firewall rules on the VPN concentrator; escalating to network team.",
    },
  });
  await prisma.ticketNote.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      ticketId: ticket3.id,
      authorId: sarah.id,
      content: "Waiting on requester to confirm mobile OS version before continuing.",
    },
  });

  // ---------------------------------------------------------------------
  // Attachment (unchanged from Lab 2) for download tests.
  // ---------------------------------------------------------------------
  const uploadDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const attachmentPath = path.join(uploadDir, "seed-test-attachment.png");
  const pngContent = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  fs.writeFileSync(attachmentPath, pngContent);

  await prisma.attachment.upsert({
    where: { id: 1 },
    update: {
      ticketId: ticket1.id,
      fileName: "seed-test-attachment.txt",
      fileSize: fs.statSync(attachmentPath).size,
      mimeType: "image/png",
      storagePath: attachmentPath,
      isRemoved: false,
      removedAt: null,
      removedReason: null,
    },
    create: {
      ticketId: ticket1.id,
      fileName: "seed-test-attachment.txt",
      fileSize: fs.statSync(attachmentPath).size,
      mimeType: "image/png",
      storagePath: attachmentPath,
    },
  });

  console.log(
    "Seed complete: categories, related systems, users (Requester/IT Staff/Administrator), " +
      "tickets, comments, and notes.",
  );
}

// Only auto-run (and disconnect) when this file is executed directly via
// `tsx prisma/seed.ts`. Tests import `{ main }` and call it themselves,
// against the shared Prisma client, without disconnecting it.
const isRunDirectly = process.argv[1]?.endsWith("seed.ts");
if (isRunDirectly) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
