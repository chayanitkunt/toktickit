# Lab 2 AI Use Documentation & Reflection

## 1. LLM / AI Specification Agent Information
* **AI Model / Tool Used:**  Google Gemini 1.5 Pro
* **Role in Sprint:** Engineering Specification Assistant, Test Planner, and Code Review Companion.

## 2. Key Prompt Log

| Prompt # | Stage | Target File / Task | Key Prompt Text | Outcome / Result |
| :--- | :--- | :--- | :--- | :--- |
| **P-01** | Spec DD | `specification.md` | `Read Lab 2 labsheet and analyze stakeholder requirements. Draft functional requirements (FR-01 to FR-12) and business rules (BR-01 to BR-15) for Requester ticketing MVP, excluding real auth and IT Staff workflow.` | Generated comprehensive specification structure with strict scope boundaries. |
| **P-02** | Spec DD | `api-spec.md` | `Design REST API contract for TokTickIT Lab 2 including endpoint paths, HTTP methods, headers (X-Requester-Id), request/response JSON schemas, pagination query parameters, and 400/403/413 error formats.` | Produced clean, consistent REST API contract covering all mandatory capabilities. |
| **P-03** | Spec DD | `ui-spec.md` | `Extract Zen Green Theme design tokens (#006B3C, #0B7A46, #EAF6EF, #F5F7F6) and define component states, responsive layout rules (desktop/tablet/mobile), and form validation placement.` | Established reusable visual style guide and responsive design rules. |
| **P-04** | Test DD | `tests.md` | `Generate a Test DD matrix mapping Acceptance Criteria (AC-01 to AC-10) to unit, API, UI component, and Playwright E2E test files.` | Created test plan table with explicit test file paths and expected outcomes. |
| **P-05** | Dev Requester Context | Issue 2 | `Draft Prisma schema increment for RequesterUser (active/inactive) and Development Requester context hook for simulated login in Lab 2.` | Produced safe Prisma schema and frontend state management pattern. |
| **P-06** | Ticket Creation | Issue 4 | `Implement Create Ticket form logic with attachment validation rules (max 5MB, types: JPG, PNG, WEBP, PDF, max 5 files) and field-level error feedback.` | Code generated with immediate validation feedback matching BR rules. |
| **P-07** | Ticket List | Issue 5 | `Implement My Tickets table with search, category/priority/status filters, sorting, and pagination while enforcing Requester ownership isolation.` | Delivered responsive list with proper URL query params and ownership guard. |
| **P-08** | Attachment Lifecycle | Issue 6 | `Implement Ticket Detail read-only view and attachment soft-removal logic requiring a mandatory removal reason. Ensure soft-removed files block download.` | Implemented safe soft-removal logic with recorded reason metadata. |

## 3. My Reflection on AI Use
Working with an AI Specification Agent allowed us to transition from raw stakeholder requirements into a formal, testable engineering contract before writing code. Using Spec-Driven Development (Spec DD) helped identify missing business rules—such as attachment soft-removal reasons and ownership protection—early in the sprint. While the AI agent was highly effective at drafting specifications and boilerplate test cases, human intervention was critical to verify edge cases, refine visual styling according to the Zen Green palette, and enforce strict backend ownership checks. All AI-generated output was reviewed, tested, and validated against the course labsheet.