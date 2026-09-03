# Lab 2 — Peer Review Record

This document is evidence for Part 1 (Git Use with Engineering Workflow) of the Lab 2 submission. It details real reviewer identities, PR links, actual comments, and author responses for Lab 2.

## 1. Reviewer Identity

| Role | Name - Student ID | GitHub Username |
| --- | --- | --- |
| Author (this repo) | Chayanit Kuntanarumitkul - 67070503408 | @chayanitkunt |
| Peer Reviewer | Kulchaya Paipinij - 67070503406 | @chayongchaya |

## 2. Pull Requests Reviewed in Lab 2

List every feature-branch PR merged into `lab2-staging`, plus the final `lab2-staging` → `main` release PR.

| PR # | Title | Branch → Target | Link | Reviewer(s) | Approval Status |
| --- | --- | --- | --- | --- | --- |
| #19 | docs: complete Lab 2 sprint specification | feature/lab2-specification → main¹ | https://github.com/chayanitkunt/toktickit/pull/19 | @chayongchaya | ✅ Approved |
| #20 | feat: add development requester context | feature/6-development-requester-context → lab2-staging | https://github.com/chayanitkunt/toktickit/pull/20 | @chayongchaya | ✅ Approved |
| #21 | feat: implement Ticket and Attachment data foundation | feature/13-ticket-attachment-foundation → lab2-staging | https://github.com/chayanitkunt/toktickit/pull/21 | @chayongchaya | ✅ Approved |
| #22 | feat: implement ticket creation with attachments | feature/14-create-ticket → lab2-staging | https://github.com/chayanitkunt/toktickit/pull/22 | @chayongchaya | ✅ Approved |
| #23 | feat: implement My Tickets requester workflow | feature/15-my-tickets → lab2-staging | https://github.com/chayanitkunt/toktickit/pull/23 | @chayongchaya | ✅ Approved |
| #24 | feat: complete Lab 2 ticket detail and attachments | feature/16-ticket-detail → lab2-staging | https://github.com/chayanitkunt/toktickit/pull/24 | @chayongchaya | ✅ Approved |
| #25 | test: add E2E, responsive, and visual QA coverage | feature/17-e2e-responsive-visual-qa → lab2-staging | https://github.com/chayanitkunt/toktickit/pull/25 | @chayongchaya | ✅ Approved |
| #26 | docs: finalize Lab 2 documentation and release (Issue #18) | feature/18-docs-finalize → lab2-staging | https://github.com/chayanitkunt/toktickit/pull/26 | @chayongchaya | ⏳ Review requested — awaiting approval |
| Release | Release: Lab 2 | lab2-staging → main | _(open PR, then paste link here)_ | @chayongchaya | ⏳ Pending — `main` is still 14 commits behind `lab2-staging`; do not mark Approved until this PR is opened, reviewed, and merged |

¹ **Note on PR #19:** the PR base was accidentally set to `main` instead of `lab2-staging` when it was opened (before `lab2-staging` existed for Lab 2). It was merged directly into `main` as a result. This was an isolated, one-time mistake — `lab2-staging` was created from `main` immediately afterward, so the specification commit is already an ancestor of `lab2-staging` (verified with `git merge-base --is-ancestor main lab2-staging`). There is no divergence, duplication, or conflict, and the upcoming Release PR (`lab2-staging → main`) will merge cleanly. Every subsequent PR (#20–#26) correctly targeted `lab2-staging` per the required branch flow.

## 3. Comments Given (as Reviewer)

Comments this author (@chayanitkunt) left on partner's (@chayongchaya) PR(s).

| PR # | File / Line | Comment | Author Response | Resolved? |
| --- | --- | --- | --- | --- |
| #19 | General / docs | "Looks good to me! The Lab 2 specification, API specification, UI specification, and test plan are clear and well organized. 👍" | "Thanks for the comment!" | ✅ |
| #20 | General / db | "LGTM! Schema and relations are solid (enums, Cascade Delete, and indexes are properly configured). Seed data covers all spec requirements (categories, systems, active/inactive requesters)." | "Thanks for your compliment" | ✅ |
| #21 | General / dev-requester | "Looks solid! Ready to merge. State management and localStorage persistence are handled cleanly. ProtectedLayout handles route protection seamlessly. API test coverage for active requesters is spot on!" | "Thanks for your help" | ✅ |
| #22 | General / ticket-creation | "Approved! Really solid feature implementation. Flexible API: Great touch allowing field aliases (title/summary, priority/requestedPriority) in tickets.ts. Form UX: Form handles submission loading states, client-side validation messages, and post-submit navigation cleanly. Test Coverage: Key edge cases like missing required fields (400 Bad Request) are properly tested." | "Thanks for your reviews!" | ✅ |
| #24 | General / ticket-details | "Ship it! Great implementation of the ticket detail view and attachment soft-deletion (DELETE /api/attachments/:id). Backend filtering for active attachments (isRemoved: false) works as expected. Added tests for GET /api/tickets/:id (200 OK & 404 Not Found) are passing cleanly." | "Thank you for checking!" | ✅ |
| #25 | General / responsive-ui-e2e | "Approved! Excellent work on the responsive UI and Playwright E2E setup. Responsive styling and Navbar profile dropdown look clean across viewports. Multer upload limits (5MB, PDF/Image types) and the 5 active attachments quota check are properly handled. End-to-end spec in Playwright covers the complete user journey smoothly." | "Thank you so much but right now, I found some bugs on the website about ownership tickets so I will fix the bug and ask for approve again." | ✅ |
| #27 | General / ticket-attachment-ownership | "Great fix! Approved and ready to merge. Ownership & Isolation: Proper 403 Forbidden checks on ticket details, attachment downloads, and soft-deletes effectively prevent unauthorized cross-user access. Test Coverage: Comprehensive API tests (attachments.api.test.ts, ticket-detail.api.test.ts, my-tickets.api.test.ts) cover ownership rules, edge cases, and soft-deletes nicely. Route Aliases: Clean handling for both /api/systems and /api/related-systems." | "Thank you so much for the detailed review and feedback! Merging this into lab2-staging pls." | ✅ |
| #29 | General / client-component-tests | "Approved! Excellent job getting the client component test suite green. Frontend Specs: Resolved all UI assertion failures and component test edge cases. Attachment Integration: TicketDetailPage attachment handling logic now meets all lab requirements cleanly. Maintainability: Scoping desktop view selectors and refining layout components makes the tests much more robust." | "Thank you for always supporting me!" | ✅ |

## 4. Comments Received (as Author)

Comments the reviewer (@chayongchaya) left on this author's (@chayanitkunt) PR(s), and how they were addressed.

| PR # | File / Line | Reviewer Comment | My Response / Fix | Resolved? |
| --- | --- | --- | --- | --- |
| #19 | General | "The documentation is very thorough, covering all key specifications, API contracts, and AI prompt logs clearly. Great work!" | "Thank you for the detailed review and approval! Glad that the specifications and documentation are clear and comprehensive." | ✅ |
| #20 | General | "The requester context implementation, Prisma schema updates, and test coverage look solid. Good job!" | "Thanks for taking a look and for the feedback! Appreciate it." | ✅ |
| #21 | General | "The database foundation, model relationships, and seed data look solid and well-structured. Good work!" | "Thanks for reviewing! Appreciate it. 🙏" | ✅ |
| #22 | General | "The ticket creation endpoint and Multer attachment validations are well handled, and the test coverage covers both happy and invalid paths nicely." | "Thanks for reviewing! Appreciate the feedback on the Multer validation." | ✅ |
| #23 | General | "The 'My Tickets' requester workflow is well put together—handling search, filtering, pagination, and form submissions cleanly. Great work!" | "Thanks for reviewing! Glad the filtering, search, and pagination came out clean." | ✅ |
| #24 | General | "The Ticket Detail view and attachment management look thoroughly implemented. Test results look solid too." | "Thanks for taking the time to review! Happy to hear the test suite and attachment logic hit the mark." | ✅ |
| #25 | General | "Excellent test coverage with Playwright across all key user flows, and great attention to detail on responsive layouts and visual QA screenshots. Ready to merge!" | "Thanks for checking out the PR! Really happy to hear the Playwright tests and responsive screenshots passed muster." | ✅ |
| #26 | General | "The finalized Lab 2 documentation, traceability updates, and automated test results (113 passing) look super thorough and complete. Ready to merge!" | "Appreciate the review! Really glad to hear the documentation, traceability, and test results look solid to you." | ✅ |

## 5. Final Approvals

| PR # | Approved By | Date | Notes |
| --- | --- | --- | --- |
| #19 | @chayongchaya | 5 days ago | Specification and documentation approved. |
| #20 | @chayongchaya | 5 days ago | Development requester context and persistence approved. |
| #21 | @chayongchaya | 5 days ago | Database models and Prisma seed data approved. |
| #22 | @chayongchaya | 4 days ago | Ticket creation endpoint with Multer attachments approved. |
| #23 | @chayongchaya | 3 days ago | My Tickets requester workflow, search, and pagination approved. |
| #24 | @chayongchaya | 2 days ago | Ticket Detail view and attachment removal logic approved. |
| #25 | @chayongchaya | 5 hours ago | Playwright E2E, responsive layouts, and visual QA approved. |
| TBD | _pending_ | _pending_ | PR #26 opened and review requested from @chayongchaya — awaiting approval and merge into `lab2-staging`.|
| Release PR | _pending_ | _pending_ | Not yet opened. Open this PR only after the docs-finalization PR above is merged into `lab2-staging` and the full test suite (server + client + Playwright) is green on that branch. Update this row with the real reviewer, date, and confirmation once `lab2-staging` → `main` is actually merged. |

## 6. Summary

In Lab 2, a total of 8 PRs on the partner's repo and 8 feature/docs PRs on this repo (#19–#26) were reviewed and authored following the specification-driven branch workflow (`feature/*` → `lab2-staging` → `main`). Code reviews verified ticket ownership validation, attachment upload/soft-deletion handling, frontend component test coverage, and Playwright E2E workflows across desktop and mobile devices. All pull requests through #25 passed peer review, satisfied specification requirements, and maintained green test suites. The docs-finalization PR (Issue #18) and the `lab2-staging` → `main` release PR are the two remaining steps before Lab 2 can be considered fully released — see the pending rows above.