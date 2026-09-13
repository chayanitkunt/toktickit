import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

  // Issue 4 fix: TicketComment and TicketNote both hold a foreign key to
  // Ticket with no cascade configured, so deleting Attachment then Ticket
  // (the original Lab 2 order) throws a foreign-key-constraint error the
  // moment any ticket has a Public Comment or Internal Note — which, since
  // Issue 4, is effectively always. That silent failure is why repeated
  // local e2e runs keep accumulating tickets indefinitely (e.g. Quinn's
  // account growing into the hundreds of tickets/dozens of pagination
  // pages) instead of actually being cleared. Comments/Notes must go first.
  await prisma.ticketComment.deleteMany({});
  await prisma.ticketNote.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.ticket.deleteMany({});
  console.log(
    "Cleared Ticket/Attachment/TicketComment/TicketNote tables. Run `npm run prisma:seed` next."
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await getPrisma().$disconnect(); });
  