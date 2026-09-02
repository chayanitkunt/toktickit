import fs from "fs";
import path from "path";
import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// Issue 12 — seed Development Requesters.
// Issue 13 — seed Related Systems.
async function main() {
  const prisma = getPrisma();

  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
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
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const requesters = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      isActive: true,
    },
    {
      name: "Bob Smith",
      email: "bob@example.com",
      isActive: true,
    },
    {
      name: "Charlie Brown",
      email: "charlie@example.com",
      isActive: false,
    },
    {
      name: "Diana Prince",
      email: "diana@example.com",
      isActive: true,
    },
    {
      name: "Ethan Hunt",
      email: "ethan@example.com",
      isActive: true,
    },
  ];

  for (const requester of requesters) {
    await prisma.requester.upsert({
      where: { email: requester.email },
      update: {
        name: requester.name,
        isActive: requester.isActive,
      },
      create: requester,
    });
  }

    // Seed a ticket with an active attachment for attachment download tests.
  const alice = await prisma.requester.findUnique({
    where: { email: "alice@example.com" },
  });

  const hardware = await prisma.category.findUnique({
    where: { name: "Hardware" },
  });

  const corporateLaptop = await prisma.relatedSystem.findUnique({
    where: { name: "Corporate Laptop" },
  });

  if (!alice || !hardware || !corporateLaptop) {
    throw new Error("Required seed data not found");
  }

  const ticket = await prisma.ticket.upsert({
    where: {
      ticketNumber: "TKT-2026-000001",
    },
    update: {},
    create: {
      ticketNumber: "TKT-2026-000001",
      requesterId: alice.id,
      categoryId: hardware.id,
      relatedSystemId: corporateLaptop.id,
      summary: "Seeded attachment test ticket",
      description: "Ticket used to test attachment download functionality.",
      requestedPriority: "HIGH",
      currentStatus: "NEW",
    },
  });

  const uploadDir = path.resolve(process.cwd(), "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  
  const attachmentPath = path.join(
  uploadDir,
  "seed-test-attachment.png"
  );

  const pngContent = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
  );

  fs.writeFileSync(attachmentPath, pngContent);

  await prisma.attachment.upsert({
    where: {
      id: 1,
    },
    update: {
      ticketId: ticket.id,
      fileName: "seed-test-attachment.txt",
      fileSize: fs.statSync(attachmentPath).size,
      mimeType: "image/png",
      storagePath: attachmentPath,
      isRemoved: false,
      removedAt: null,
      removedReason: null,
    },
    create: {
      ticketId: ticket.id,
      fileName: "seed-test-attachment.txt",
      fileSize: fs.statSync(attachmentPath).size,
      mimeType: "image/png",
      storagePath: attachmentPath,
    },
  });

  console.log("Categories, Related Systems, and Requesters seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
  