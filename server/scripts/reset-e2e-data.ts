import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();
  await prisma.attachment.deleteMany({});
  await prisma.ticket.deleteMany({});
  console.log("Cleared Ticket/Attachment tables. Run `npm run prisma:seed` next.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await getPrisma().$disconnect(); });
  