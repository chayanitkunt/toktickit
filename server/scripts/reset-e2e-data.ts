import { getPrisma } from "../src/prisma.js";

// Issue 8 fix: the same "repeated local e2e runs accumulate rows forever"
// problem documented below for Tickets also hits Users. Every e2e spec
// that exercises Administrator "create user" (user-administration.spec.ts,
// visual.spec.ts, and any others) creates a fresh account with a
// timestamped email so it never collides with a previous run — but nothing
// ever deletes those accounts afterward (Lab 3 intentionally excludes user
// deletion from the product itself, §4.2). Left unchecked, the User
// Management list grows by a handful of rows on every single test run,
// eventually turning a one-page screen into hundreds of rows of "Test
// Automation User" / "Searchable Requester test-..." junk — which is
// exactly what showed up in the User Management screenshots.
//
// This does NOT add pagination to the product (§4.2 explicitly says
// pagination for the user list is not required) — it just keeps the local
// dev database at the same known baseline the seed script establishes, the
// same way this script already does for Tickets/Comments/Notes.
const CANONICAL_EMAILS = [
  "alice@example.com",
  "bob@example.com",
  "charlie@example.com",
  "diana@example.com",
  "ethan@example.com",
  "quinn.requester@example.com",
  "riley.requester@example.com",
  "michael.brown@tiktockit.com",
  "staff.automation.b@tiktockit.com",
  "sarah.johnson@tiktockit.com",
  "david.lee@tiktockit.com",
  "kevin.patel@tiktockit.com",
  "jennifer.anderson@tiktockit.com",
];

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

  // All Ticket/Comment/Note/Attachment rows are gone at this point, so no
  // User can still be referenced by a requesterId/ownerId/authorId foreign
  // key — safe to delete every User row that isn't one of the documented
  // seed accounts.
  const { count } = await prisma.user.deleteMany({
    where: { email: { notIn: CANONICAL_EMAILS } },
  });

  console.log(
    `Cleared Ticket/Attachment/TicketComment/TicketNote tables and removed ${count} non-seed User row(s). Run \`npm run prisma:seed\` next.`
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await getPrisma().$disconnect(); });
  