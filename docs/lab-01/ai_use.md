# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Gemini 3.5 Flash / Antigravity Agent

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Analyze the Lab 1 requirements and explain the required Git/GitHub workflow. | Used the explanation to understand the feature branch and PR workflow. |
| 2 | Check whether the current repository structure matches the Lab 1 requirements. | Compared the result with the actual repository and corrected the folder structure. |
| 3 | Help diagnose why `frontend` and `backend` folders were created in the wrong location. | Followed the explanation and removed the incorrectly nested folders. |
| 4 | Check the current Issue #1 acceptance criteria against the project state. | Used the result to identify what was completed and what was still missing. |
| 5 | Implement Prisma seed script for 4 initial categories with idempotency. | Implemented `prisma/seed.ts` using `upsert` and verified with `npx prisma db seed`. |
| 6 | Implement GET /api/categories endpoint returning categories ordered by id. | Added route in Express server and verified using Supertest API test. |
| 7 | Update React Check System UI to handle loading, success, and error states. | Updated `App.tsx` and `api.ts` to fetch and display categories properly. |
| 8 | Un-skip and implement Vitest component tests in App.test.tsx. | Fixed mock handlers in Vitest tests and achieved 3/3 passing client tests. |


## Reflection
My prompts became better when I included the exact issue number, current project state, and command output instead of asking general questions. I also learned to verify the agent's suggestions by checking Git status, repository files, and the existing starter code before applying changes. One example was correcting the generated JavaScript files because the project already used TypeScript files such as `App.tsx`, `api.ts`, and `main.tsx`.