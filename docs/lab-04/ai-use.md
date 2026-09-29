# Lab 4 AI Use Documentation and Reflection

## 1. AI tool and role

- **Tool used:** OpenAI Codex / ChatGPT
- **Role in Sprint:** specification assistant, implementation companion, test planner, debugging aide, and accessibility QA assistant.

AI suggestions were reviewed against the Lab 4 handout and the existing TokTickIT codebase. The
author made the final design decisions, ran the tests, inspected the UI, and corrected proposals
that did not match the approved contract.

## 2. Selected prompt log

| # | Stage | Selected prompt (abridged) | How it was used and verified |
| --- | --- | --- | --- |
| P-01 | Spec DD | “Turn the Lab 4 handout into a concise engineering contract with numbered requirements, business rules, transitions, dashboards, API rules, and acceptance criteria.” | Used to structure `specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md`; checked against the handout before implementation. |
| P-02 | Data/API | “Design an additive Prisma Actions Taken model and REST endpoints that preserve earlier Lab data and enforce authenticated performers.” | Informed the migration, seed cases, validation, and backend authorization; verified by API tests and Prisma migration deployment. |
| P-03 | Actions Taken UI | “Implement an accessible Actions Taken tab with read-only Requester access, staff create/edit, follow-up validation, conflict feedback, and responsive table/cards.” | Used to build the Ticket Detail section; verified with component tests, Playwright flows, and screenshots. |
| P-04 | Workflow | “Define and enforce the final Ticket transition matrix, resolution gate, and optimistic-concurrency contract.” | Helped identify the server-side resolution gate and `expectedUpdatedAt` behavior; verified through workflow API/E2E tests. |
| P-05 | Dashboards | “Specify concise Requester and IT Staff dashboard metrics, date boundaries, access rules, and drill-down filters.” | Used to shape the dashboard endpoints and UI; verified against authoritative API counts and dashboard tests. |
| P-06 | Dashboard UI | “Build role-aware dashboard cards, recent Ticket lists, loading/empty/error states, keyboard actions, and responsive layouts.” | Used for component structure and drill-down behavior; verified with component/E2E tests and desktop/tablet/mobile captures. |
| P-07 | Regression | “Audit Lab 1–3 flows after the Lab 4 changes and find inconsistent loading, error, authorization, and duplicate-submit behavior.” | Guided regression checks and final hardening; existing suites were rerun before release. |
| P-08 | Accessibility | “Review focus states, accessible names, tab behavior, status cues, and mobile overflow on the new Lab 4 screens.” | Produced concrete fixes: high-contrast focus styles, native radio grouping, labelled feedback, keyboard tabs, shared text status badges, and responsive header layout. Verified by tests and visual review. |
| P-09 | API review | “Check the dashboard API tests for missing boundaries, role checks, list caps, and index/schema alignment.” | Led to additional multi-status, authorization, and dashboard boundary coverage; verified by focused API tests. |
| P-10 | Release | “Create a final release checklist that separates repository-verifiable evidence from GitHub actions that need a human account.” | Used to prepare the present release materials and avoid representing unperformed review/merge work as complete. |

## 3. My reflection

I used AI as a collaborative engineering assistant, not as an authority or a substitute for testing.
It helped me translate a long handout into a consistent specification, break the work into issues,
find regression risks, and generate focused test ideas. It was especially useful in the final QA
pass: the review surfaced accessibility details that were easy to miss visually, such as keyboard
focus contrast, radio grouping, semantic tabs, and status cues that should not depend only on
colour.

I still reviewed every proposed change in the context of this repository. For example, I confirmed
that the resolution gate ran on the backend, not only in the UI; I checked that Requester dashboard
filters remained ownership-scoped; and I reran the relevant API, component, build, and Playwright
checks after changes. AI occasionally suggested a pattern that needed adjustment for the existing
application or the assignment's exact scope, so I treated its output as a draft and remained
responsible for the final code, documentation, testing evidence, and submission decisions.
