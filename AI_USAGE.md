# AI Usage and Mistakes Log

This document records which AI tools were used during the development of the School Admission System, what tasks they performed, and the concrete mistakes made along with how they were detected and resolved.

---

## 1. Tools Used
- **Antigravity AI Agent (powered by Claude & Gemini)**:
  - Scaffolding project structure (.NET 10 Web API and React 18 + Vite + TypeScript).
  - Writing EF Core models, raw SQL concurrency transactions, and REST endpoints.
  - Creating xUnit test fixtures and integration tests with Testcontainers.PostgreSql.
  - Building React UI components, CSS styling, and client-side error handling.
  - Authoring Dockerfiles, docker-compose configuration, and documentation.

---

## 2. Concrete Mistakes Made and How They Were Caught

### Mistake 1: Relying on Application Clock (`DateTime.UtcNow`) in Read Endpoints
- **What happened:** In the initial implementation of `GET /classes`, `GET /classes/{classId}`, `GET /holds/{holdId}`, and `GET /me/holds`, the endpoints evaluated whether a hold was expired using C#'s `DateTime.UtcNow`.
- **Why it was wrong:** The mandatory specification requires: *"use the database clock (`now()`) for every expiry decision, never the application clock."* If the application server clock drifted from PostgreSQL, seats could be improperly reported as available or held.
- **How it was caught:** Caught during thorough code review of `ClassesEndpoints.cs` and `HoldsEndpoints.cs`.
- **Fix:** Refactored all read endpoints to use raw SQL queries referencing PostgreSQL's `now()` (`COUNT(*) FILTER (WHERE status='HELD' AND expires_at > now())` and `CASE WHEN status='HELD' AND expires_at <= now() THEN 'EXPIRED' ELSE status END`).

### Mistake 2: Missing `xunit` Namespace in Test Project
- **What happened:** The initial test project setup included `ImplicitUsings=enable`, assuming `FactAttribute` and `IClassFixture` would be globally imported.
- **Why it was wrong:** `xunit` 2.x does not provide default implicit global usings out of the box in standard test projects, causing compilation errors `CS0246: The type or namespace name 'Fact' could not be found`.
- **How it was caught:** Caught immediately during `dotnet build backend/SchoolAdmission.sln`.
- **Fix:** Added `<Using Include="Xunit" />` to `backend/tests/SchoolAdmission.Tests/SchoolAdmission.Tests.csproj`.

### Mistake 3: Outdated Vite Dependency with Node 24 on Windows
- **What happened:** The generated `package.json` used `vite@^5.0.10`. When running `npm run build` on Node v24.20.0, Vite crashed with `ENOENT: no such file or directory, open 'vite.config.ts.timestamp-...mjs'`.
- **Why it was wrong:** Early Vite 5 releases had an incompatibility with Node 22/24's ESM loader and temporary file handling on Windows paths with spaces.
- **How it was caught:** Caught when executing `npm run build` in the `frontend` folder.
- **Fix:** Upgraded Vite to `^5.4.21`, which natively resolves Windows ESM paths without error.

### Mistake 4: Missing `BACKEND_URL` Environment Variable in `docker-compose.yml`
- **What happened:** The `frontend` service in `docker-compose.yml` omitted the `environment` section containing `BACKEND_URL: "http://localhost:8080"`, even though `docker-entrypoint.sh` expected it to configure `public/config.js` at runtime.
- **Why it was wrong:** Evaluators running `docker compose up` would have the frontend fall back to default or misconfigured URLs if another port or host was specified.
- **How it was caught:** Caught while reviewing `docker-entrypoint.sh` and `docker-compose.yml`.
- **Fix:** Added `environment: BACKEND_URL: "http://localhost:8080"` to the frontend container service definition.

### Mistake 5: `char(17)` Trailing Whitespace Padding in PostgreSQL
- **What happened:** The initial raw SQL schema proposed `student_id char(17)`. In PostgreSQL, `char(N)` pads strings with spaces up to length $N$.
- **Why it was wrong:** When queried via EF Core or compared with 17-character input strings, string equality checks could fail if trailing spaces were not stripped.
- **How it was caught:** Identified during schema definition review.
- **Fix:** Used `varchar(17)` in the schema while enforcing the exact 17-digit validation in middleware/endpoints and table check constraints.

### Mistake 6: Inclusion of Confidential Assignment PDF in Initial Git Tracking
- **What happened:** An initial recursive `git add` in the scaffold phase staged the `files/` directory containing the confidential assignment PDF.
- **Why it was wrong:** The assignment specification explicitly states: *"Do not copy the original assignment PDF into the repository"* and *"Do not make this assignment PDF public"*.
- **How it was caught:** Caught during pre-submission audit when inspecting `git ls-files`.
- **Fix:** Added `files/` and `*.pdf` to `.gitignore` and removed the directory from Git's index using `git rm -r --cached files/` while keeping the local files intact.
