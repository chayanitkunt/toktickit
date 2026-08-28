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
  