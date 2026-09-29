# Lab 4 — Peer Review Record

This document is evidence for Part 1 (Git Use with Engineering Workflow) of the Lab 4 submission. It details real reviewer identities, PR links, actual review comments, and author responses for Lab 4.

## 1. Reviewer Identity

| Role | Name - Student ID | GitHub Username |
| --- | --- | --- |
| Author (this repo) | Chayanit Kuntanarumitkul - 67070503408 | @chayanitkunt |
| Peer Reviewer | Kulchaya Paipinij - 67070503406 | @chayongchaya |

## 2. Pull Requests I Authored (chayanitkunt/toktickit)

List of feature-branch PRs authored by @chayanitkunt and merged into `lab4-staging`, reflecting exact repository PR numbers.

| PR # | Title | Branch → Target | Link | Reviewer(s) | Approval Status |
| --- | --- | --- | --- | --- | --- |
| #61 | docs: define Sprint 4 engineering contract | docs/1-sprint4-engineering-contract → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/61 | @chayongchaya | ✅ Approved & Merged (commit `8e3e963`) |
| #62 | feat: implement Actions Taken backend | feat/2-actions-taken-backend → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/62 | @chayongchaya | ✅ Approved & Merged (commit `dc261c1`) |
| #63 | feat: implement Actions Taken UI | feat/3-actions-taken-ui → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/63 | @chayongchaya | ✅ Approved & Merged (commit `e5c87a3`) |
| #64 | feat: enforce ticket resolution and concurrency | feat/4-ticket-resolution-concurrency → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/64 | @chayongchaya | ✅ Approved & Merged (commit `2ec3060`) |
| #65 | feat: implement requester and staff dashboard APIs | feat/5-dashboard-apis → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/65 | @chayongchaya | ✅ Approved & Merged (commit `b3721fe`) |
| #66 | feat: implement Requester and IT Staff dashboards | feat/6-dashboards → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/66 | @chayongchaya | ✅ Approved & Merged (commit `0590ab5`) |
| #67 | test: complete Lab 1-3 regression and final hardening | feat/7-lab1-3-regression-hardening → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/67 | @chayongchaya | ✅ Approved & Merged (commit `c514c54`) |
| #68 | test: complete Lab 4 visual and accessibility QA | feat/8-lab4-visual-responsive-accessibility-qa → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/68 | @chayongchaya | ✅ Approved & Merged (commit `0e46b9b`) |
| #69 | docs: add Lab 4 AI use documentation | docs/9-lab4-release-integration-submission → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/69 | @chayongchaya | ✅ Approved & Merged (commit `c8f94f9`) |
| #70 | docs: add Lab 4 peer review record | docs/10-lab4-reviewer-record → lab4-staging | https://github.com/chayanitkunt/toktickit/pull/70 | @chayongchaya | ✅ Approved & Merged (commit `daaeb74`) |

### 2.1 Final Release PR (lab4-staging → main)

| PR # | Title | Branch → Target | Link | Reviewer(s) | Approval Status |
| --- | --- | --- | --- | --- | --- |
| #71 | docs: complete Lab 4 release integration and submission package | lab4-staging → main | https://github.com/chayanitkunt/toktickit/pull/71 | @chayongchaya | ✅ Approved (1 approving review, no conflicts with base branch) |

Release PR #71 consolidates all of Sprint 4 from `lab4-staging` into `main` in a single integration step: 23 commits and 60 changed files (+3,075 / −70 lines). It includes the ten reviewed feature/docs/test PRs #61–#70 — the Sprint 4 engineering contract, Actions Taken backend and UI, ticket resolution and optimistic concurrency enforcement, Requester and IT Staff dashboards, Lab 1–3 regression hardening, responsive/visual/accessibility QA, AI-use documentation, and this peer review record. Every one of those PRs had already been approved by @chayongchaya before merging into `lab4-staging`. The release PR was approved by @chayongchaya with no conflicts against `main`, and it closes Issue #60 (`Closes #60`). 

## 3. Pull Requests I Reviewed (chayongchaya/toktickit)

List of feature-branch PRs authored by @chayongchaya and merged into `lab4-staging` in her repo, with @chayanitkunt as reviewer/approver.

| PR # | Title | Branch → Target | Link | Author | Approval Status |
| --- | --- | --- | --- | --- | --- |
| #86 | docs(lab-04): Establish Lab 4 Engineering Contract (Spec-DD) | docs/lab4-engineering-contract → lab4-staging | https://github.com/chayongchaya/toktickit/pull/86 | @chayongchaya | ✅ Approved & Merged (commit `16eb035`) |
| #88 | Feature/lab4 actions taken db | feature/lab4-actions-taken-db → lab4-staging | https://github.com/chayongchaya/toktickit/pull/88 | @chayongchaya | ✅ Approved & Merged (commit `0721195`) |
| #90 | feat(api): Implement Actions Taken endpoints and ticket detail integration | feature/lab4-actions-taken-api → lab4-staging | https://github.com/chayongchaya/toktickit/pull/90 | @chayongchaya | ✅ Approved & Merged (commit `57310fa`) |
| #92 | feat(ui): Implement Actions Taken interface, unified modal form, and requester read-only view | feature/lab4-actions-taken-ui → lab4-staging | https://github.com/chayongchaya/toktickit/pull/92 | @chayongchaya | ✅ Approved & Merged (commit `eed3082`) |
| #94 | chore(test): Isolate Actions Taken fixtures and decouple requester test state from auth suites | fix/lab4-test-isolation → lab4-staging | https://github.com/chayongchaya/toktickit/pull/94 | @chayongchaya | ✅ Approved & Merged (commit `6f42094`) |
| #96 | feat: Implement role-based Dashboards, navigation landing, and queue drill-down filters | feature/lab4-dashboards → lab4-staging | https://github.com/chayongchaya/toktickit/pull/96 | @chayongchaya | ✅ Approved & Merged (commit `08b9388`) |
| #97 | test: Enhance Lab 4 test coverage, concurrency isolation, and verification documentation | test/lab4-coverage → lab4-staging | https://github.com/chayongchaya/toktickit/pull/97 | @chayongchaya | ✅ Approved & Merged (commit `b032c84`) |


## 4. Comments Given (as Reviewer)

Comments this author (@chayanitkunt) left on partner's (@chayongchaya) PR(s). No review requested code changes; each review approved the PR directly.

| PR # | Comment | Author Response | Resolved? |
| --- | --- | --- | --- |
| #86 | "Outstanding work establishing the Sprint 4 Spec-DD engineering contract! Approved<br/>- **Spec-DD Foundation:** Clear definitions for SLA state transitions, escalation triggers, and immutable activity audit logs in specification.md.<br/>- **API & UI Alignment:** Standardized endpoint contracts (/activities, /escalate, /metrics) and UI tokens for SLA badges (Healthy, Warning, Breached).<br/>- **Test Matrix:** Well-structured test coverage mapping (SLA-01 through E2E-04) ensuring clear verification criteria before implementation." | "Thank you so much for the thorough review and sign-off on the Sprint 4 Spec-DD contract!" | ✅ |
| #88 | "Excellent database engineering for the Actions Taken foundation. The additive-only SQL migration guarantees zero disruption to legacy Lab 1–3 schema data, and configuring indexes on ticketId and performedById alongside onDelete: Cascade ensures optimal performance and clean relational integrity. The idempotent seed fixtures covering edge cases (0, 1, and multiple actions with follow-up flags) and thorough row-count verification make this solid." | "Thank you so much for the thorough review and verification of the database layer." | ✅ |
| #90 | "Robust backend API delivery for the Actions Taken endpoints. Enforcing server-managed timestamps (actionDateTime) and session-derived actors (performedById) effectively prevents tampering, while the cross-ticket isolation guard on PATCH ensures bulletproof data integrity. Adhering to TDD with all test suites (API-01 through API-09) green across 107 tests and atomic commits makes this clean and completely audit-ready." | "Thank you so much for the thorough review and sign-off on the API implementation." | ✅ |
| #92 | "Superb work delivering the client-side Actions Taken UI. Replacing the placeholder with a dedicated tab and dynamic badge count gives Staff an intuitive workflow, while strictly rendering a read-only audit log for Requesters enforces proper role separation. Form resilience features—such as in-flight double-submission prevention (§8.5), preserving user inputs during API errors, and conditional field rendering for follow-ups—provide excellent UX. With UI-01 through UI-08 and A11Y-01 passing cleanly, this is ready to merge." | "Thank you so much for the detailed review and sign-off on the UI layer." | ✅ |
| #94 | "Essential and well-architected test-hardening fix. Replacing shared seeded records with dedicated, ephemeral fixtures and explicit afterEach teardown cleanly eliminates parallel database mutation collisions. Decoupling requester fixtures from the concurrent authentication suites guarantees deterministic execution and wipes out the intermittent race conditions. With 20/20 test files and 107/107 tests passing consistently, this is solid." | "Thank you so much for the thorough review and sign-off on the test-hardening fix." | ✅ |
| #96 | "Approved!<br/>- **Visual Alignment Polish:** Great addition with commit 62af114 to fine-tune the dashboard visuals against the Sprint 4 UI specification.<br/>- **Full-Stack Execution:** Post-login /dashboard landing, URL search param drill-downs (?status=, ?owner=, ?currentStatus=), and role boundaries are rock solid.<br/>- **Test Integrity:** All API (10–17), UI (09–12), and E2E (05–06) test suites passing cleanly." | "Thank you so much for the comprehensive review and approval. The dashboard visuals, drill-down parameters, and role guards are officially locked in." | ✅ |
| #97 | "Outstanding test stabilization and coverage expansion!<br/>- **Workflow & Concurrency Coverage:** ticket-workflow.api.test.ts thoroughly verifies WORKFLOW-01..06 and CONC-01 stale transition rules with isolated fixtures.<br/>- **DB Race Condition Fix:** Adding --no-file-parallelism to the server test script cleanly prevents shared PostgreSQL state pollution during integration runs.<br/>- **E2E & Spec Alignment:** Responsive locator fixes for mobile navbars and E2E specs for Actions Taken/Resolution keep testing aligned with docs/lab-04/tests.md." | "Thank you so much for the thorough review and sign-off on the test stabilization and coverage expansion! Passing --no-file-parallelism and refining the mobile navbar locators completely removes the remaining flakiness." | ✅ |


## 5. Comments Received (as Author)

Comments the reviewer (@chayongchaya) left on this author's (@chayanitkunt) PR(s), and how they were addressed. No review requested code changes; each review approved the PR directly.

| PR # | File / Line | Reviewer Comment | My Response / Fix | Resolved? |
| --- | --- | --- | --- | --- |
| #61 | General | "The Sprint 4 engineering contract and test planning suite are exceptionally thorough. The status transition matrix, Actions Taken concurrency rules, and dashboard metric boundary definitions establish a solid, unambiguous foundation for implementation. The test plan provides complete AC traceability, and backward compatibility with Lab 1–3 schema decisions is well preserved. Approved! Ready to merge into `lab4-staging` as the single source of truth for Sprint 4." | "Appreciate the review and feedback! Really happy that all four core engineering documents (specification.md, ui-spec.md, api-spec.md, tests.md) and AC traceability mapped out clearly." Before approval, I also pushed the follow-up commit `7c4bc89` ("docs: refine Lab 4 UI specification"). | ✅ |
| #62 | General | "Exceptional work on the Actions Taken backend foundation. The additive Prisma migration cleanly preserves legacy Lab 1–3 records, and enforcing optimistic concurrency via `expectedUpdatedAt` alongside the resolution-gate requirement makes ticket status transitions robust. Server-deriving `performedBy` and `actionDateTime` provides solid audit integrity, and updating the existing Lab 3 status test suites ensures full backward compatibility. Approved and ready to merge." | "Thanks for the thorough review and approval! Glad the optimistic concurrency contract (expectedUpdatedAt) and resolution-gate enforcement align well with the spec." | ✅ |
| #63 | General | "The Actions Taken UI implementation is remarkably thorough and aligns perfectly with the Sprint 4 UI specification. The responsive layout adaptation across desktop, tablet, and mobile, coupled with immutable audit fields, robust 409 conflict preservation, and duplicate-submission guards, provides a seamless user experience. Component and cross-viewport Playwright E2E suites passing cleanly confirms rock-solid stability." | "Thanks for the thorough review and approval! Glad the responsive layouts, immutable audit fields, and 409 conflict form preservation look solid." | ✅ |
| #64 | General | "Superb implementation of the resolution gate and optimistic concurrency workflow. Enforcing the `resolution_requires_action_taken` gate on the backend cleanly prevents direct API bypasses, while prioritizing stale-update checks via `expectedUpdatedAt` guarantees data integrity under concurrent writes. The dynamic UI feedback for blocked transitions and state preservation during recoverable errors provide a great user experience. Full API transition matrix, regression, and cross-viewport E2E tests are all green." | "Thanks for the thorough review and approval! Glad the backend resolution gate, optimistic concurrency checks, and stale-count race condition fix look solid." | ✅ |
| #65 | General | "Stellar backend implementation for the Requester and IT Staff Dashboard APIs. Strict enforcement of authenticated user scope prevents ID tampering, while RBAC cleanly guards the Staff metrics against Requester access. Indexing queries for status, priority, and recent updates via the additive Prisma migration guarantees high performance as data scales, and stripping redundant fields like descriptions keeps payloads light and secure. With all 6/6 tests green and TypeScript building without errors." | "Thanks for the thorough review and approval! Glad the security scoping, payload optimizations, and database indexing look good." | ✅ |
| #66 | General | "Exceptional frontend delivery for the Requester and IT Staff/Administrator Dashboards. The role-aware post-login routing, interactive drill-down queries to filtered queues, and automatic search-focus behavior make for an intuitive user experience. Strictly adhering to the authorization model by omitting staff-side ticket creation preserves domain boundaries, while maintaining full keyboard accessibility, responsive breakpoints, and resilient empty/error states ensures production-grade quality. All component and E2E tests (Desktop, Tablet, Mobile) passing cleanly makes this ready to merge." | "Thanks for the thorough review and approval! Glad the role-aware post-login landing, queue drill-downs, and cross-viewport E2E tests look solid." | ✅ |
| #67 | General | "Thorough and rigorous final UI, accessibility, and regression hardening for Sprint 4. Standardizing Zen Green visual tokens and enforcing distinct, visible keyboard focus indicators across all dashboard and action controls elevates the overall WCAG compliance. Decoupling status indicators from relying on color alone, clearly partitioning internal audit logs from Requester views, and resolving the Dashboard-first navigation E2E regressions make the user experience rock-solid. With 48/48 client component tests, full regression suites, and cross-viewport visual screenshot evidence verified, this is fully approved and ready to merge." | "Thanks for the thorough review and approval! Glad the Zen Green styling, accessibility focus states, and cross-viewport screenshot evidence look good." | ✅ |
| #68 | General | "Thorough and rigorous final UI, accessibility, and regression hardening for Sprint 4. Standardizing Zen Green visual tokens and enforcing distinct, visible keyboard focus indicators across all dashboard and action controls elevates the overall WCAG compliance. Decoupling status indicators from relying on color alone, clearly partitioning internal audit logs from Requester views, and resolving the Dashboard-first navigation E2E regressions make the user experience rock-solid. With 48/48 client component tests, full regression suites, and cross-viewport visual screenshot evidence verified, this is fully approved and ready to merge into `lab4-staging`." | "Thanks for the thorough review and approval! Glad the tab semantics, keyboard focus contrast, and multi-status API filtering look solid." | ✅ |
| #69 | General | "Transparent, comprehensive, and well-structured AI-use documentation for Lab 4. The 10 representative prompts provide complete coverage across the entire development lifecycle—from early Spec-DD planning and database modeling to concurrency hardening, accessibility compliance, and final release preparation. The reflection critically highlights the human-in-the-loop verification process, demonstrating that AI outputs were systematically validated against the engineering contract and regression suites." | "Thanks for the review and approval! Glad the AI-use documentation and prompt reflection captured our workflow clearly." | ✅ |
| #70 | General | "Complete and meticulously prepared peer-review documentation for the Lab 4 submission package. Capturing author/reviewer identities, individual feature PR review logs, cross-repository peer review records, and structured review-response threads provides full auditing transparency. Leaving standardized placeholders for the final lab4-staging → main release PR ensures an orderly sign-off for Issue #60." | "Thanks for the review and approval! Glad the peer review log and audit trail structure look solid." | ✅ |
| #71 (Release) | General | "This final release PR perfectly consolidates Sprint 4 into main. The entire engineering lifecycle—from initial Spec-DD planning and additive database migrations to Actions Taken audit trails, optimistic concurrency locking, role-aware dashboards, and WCAG accessibility hardening—has been executed to the highest standard. All regression test suites, cross-viewport Playwright E2E runs, AI-use reflections, and peer review logs are fully verified. Approved without reservation. Ready to merge into main and officially close Issue #60!" | "Thanks for the final review and approval! It's been an incredible sprint working together." | ✅ |

## 6. Final Approvals

Dates are estimated from the relative GitHub timestamps ("2 days ago", "yesterday", etc.) as captured on 29 Sep 2026; verify against the PR pages before submitting.

| PR # | Approved By | Date (est. from PR timestamps) | Notes |
| --- | --- | --- | --- |
| #61 | @chayongchaya | ~27 Sep 2026 | Sprint 4 engineering contract, specifications, and test plan approved. |
| #62 | @chayongchaya | ~27 Sep 2026 | Actions Taken backend (Prisma migration, seed, APIs, authorization, optimistic concurrency) approved. |
| #63 | @chayongchaya | ~27 Sep 2026 | Actions Taken UI (list, create/edit, conflict handling, responsive layouts) approved. |
| #64 | @chayongchaya | ~27 Sep 2026 | Resolution gate and stale-update concurrency workflow approved. |
| #65 | @chayongchaya | ~28 Sep 2026 | Requester and IT Staff dashboard APIs and additive indexes approved. |
| #66 | @chayongchaya | ~28 Sep 2026 | Requester, IT Staff, and Administrator dashboard UI approved. |
| #67 | @chayongchaya | ~28 Sep 2026 | Lab 1–3 regression and final hardening approved. |
| #68 | @chayongchaya | 29 Sep 2026 | Lab 4 visual, responsive, and accessibility QA approved. |
| #69 | @chayongchaya | 29 Sep 2026 | Lab 4 AI-use documentation (10 prompts and reflection) approved. Part of Issue #60. |
| #70 | @chayongchaya | 29 Sep 2026 | Lab 4 peer review record (`reviewer.md`) approved and merged into `lab4-staging`. Part of Issue #60. |


## 7. Summary

In Lab 4, @chayanitkunt authored docs/feature/test PRs (#61, #62, #63, #64, #65, #66, #67, #68, #69, #70) in `chayanitkunt/toktickit`, all reviewed and approved by @chayongchaya before merging into `lab4-staging`. Code reviews verified:
* **Engineering Contract:** The Sprint 4 specification, UI spec, API spec, and test plan with Acceptance-Criterion traceability were reviewed and merged before the implementation PRs — chayanitkunt/toktickit#61.
* **Actions Taken & Audit Integrity:** Additive Prisma migration preserving Lab 1–3 data, server-derived `performedBy` and Action Date/Time, requester read-only access, and a responsive Actions Taken UI with 409 conflict handling and duplicate-submission protection — chayanitkunt/toktickit#62, #63.
* **Ticket Workflow & Concurrency:** Backend-enforced resolution gate (`resolution_requires_action_taken`) and `expectedUpdatedAt` stale-update detection (409 `stale_ticket`), with the full transition matrix covered by API tests — chayanitkunt/toktickit#64.
* **Role Dashboards:** Requester and IT Staff dashboard APIs scoped to the authenticated user with role-based authorization, additive query indexes, and the matching Requester / IT Staff / Administrator dashboard UI with drill-down navigation — chayanitkunt/toktickit#65, #66.
* **Regression, Accessibility & Visual QA:** Lab 1–3 regression checks, Zen Green consistency, visible keyboard focus, tab semantics, multi-status filtering, and desktop/tablet/mobile screenshot evidence — chayanitkunt/toktickit#67, #68.

* **AI-Use Documentation:** `docs/lab-04/ai-use.md` with 10 representative prompts across the Lab 4 lifecycle and a reflection on how AI suggestions were verified against the repository, tests, and approved specification — chayanitkunt/toktickit#69.
* **Final Release:** Release PR chayanitkunt/toktickit#71 (`lab4-staging` → `main`, 23 commits, 60 files, +3,075 / −70) consolidates PRs #61–#70 and was approved by @chayongchaya with no merge conflicts. It closes Issue #60.
* **Independent Cross-Repo Verification:** @chayongchaya's own `chayongchaya/toktickit` repository followed the same engineering workflow in parallel — PRs #86, #88, #90, #92, #94, #96, #97 (engineering contract, Actions Taken database/API/UI, test isolation, role dashboards, and coverage expansion) reviewed and approved by @chayanitkunt before merging into `lab4-staging`, with reported green suites at #97 (Server 122/122, Client 90/90, Lab 4 E2E 8 passed / 4 skipped).
