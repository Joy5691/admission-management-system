# Build Prompt: School Admission System

Paste everything below the line into your AI coding tool (Claude Code, Antigravity, Cursor, etc.). If the tool has limited context, give it **one phase at a time** (the phases are listed at the end).

---

You are a senior full-stack engineer. Build a complete **School Admission System** in a single Git repository. Work in small phases and **make a git commit after each phase** with a clear message. Do not make one big commit at the end.

## Goal

A private school takes online admissions on a **first come, first served** basis (no lottery). Each class/shift has a limited number of seats. Applying **holds** a seat for a limited time. Paying the (fake) admission fee within that time **confirms** the admission. If the time runs out, the seat is released automatically. Thousands of guardians may apply at the same moment, so **correctness under concurrency is the most important requirement.**

## Tech stack (mandatory)

- Backend: C# on **.NET 8**, **PostgreSQL**, EF Core + Npgsql (use raw SQL where needed for the critical section).
- Frontend: **React 18 + Vite + TypeScript**.
- Everything runs in **Docker**. A `docker-compose.yml` at the repo root must start PostgreSQL, the backend and the frontend with just `docker compose up --build`. Nothing but Docker is installed on the evaluator's machine.
- Backend listens on `http://localhost:8080`. The DB connection string is an environment variable. The frontend reads the backend URL from an environment variable (remember Vite env vars are build-time; use a Docker build arg or a runtime `config.js`).
- Repo layout: `backend/`, `frontend/`, `docker-compose.yml`, `README.md`, `ASSUMPTIONS.md`, `AI_USAGE.md`.

## Domain

- Every **shift is its own "class"** with its own `totalSeats` (e.g. "Class 6 - Morning Shift" and "Class 6 - Day Shift" are two classes).
- No login. The student's identity is their **17-digit birth registration number**, entered in a box at the top of the UI and sent as the `X-Student-Id` header.
- No real payment: pressing "Pay admission fee" counts as successful payment.

## API contract (follow EXACTLY; extra response fields are allowed, but never remove or rename the listed ones)

Base URL `http://localhost:8080`, JSON in and out. IDs like `c_123` / `h_789` are examples; choose your own ID format.

1. `POST /classes`: request `{ "name": "Class 6 - Morning Shift", "totalSeats": 120 }`; `201` `{ "id", "name", "totalSeats" }`
2. `GET /classes`: `200` array of `{ "id", "name", "totalSeats", "heldSeats", "confirmedSeats", "availableSeats" }`
3. `GET /classes/{classId}`: `200` `{ "id", "name", "totalSeats", "heldSeats", "confirmedSeats", "availableSeats" }`
4. `POST /classes/{classId}/holds` (header `X-Student-Id`): `201` `{ "holdId", "classId", "studentId", "status": "HELD", "expiresAt" }`; **`409` when no seat is available**
5. `GET /holds/{holdId}`: `200` `{ "holdId", "classId", "status", "expiresAt" }` where status is one of `HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED`
6. `POST /holds/{holdId}/confirm` (header `X-Student-Id`): `200` `{ "holdId", "status": "CONFIRMED" }`
7. `DELETE /holds/{holdId}` (header `X-Student-Id`): `204` on success
8. `GET /me/holds` (header `X-Student-Id`): `200` array of `{ "holdId", "classId", "className", "status", "expiresAt" }`

`expiresAt` is an ISO-8601 UTC string, e.g. `2026-11-01T04:10:00Z`.

## Mandatory backend rules

1. `held + confirmed` of a class must **never exceed `totalSeats`**, however many concurrent requests arrive.
2. Hold duration comes from env var `HOLD_DURATION_SECONDS` (default `600`). After it elapses, the seat must return **by itself**, with no API call needed.
3. A student may not have more than one active (`HELD` or `CONFIRMED`) application in the same class.
4. Only the caller's own, not-yet-expired `HELD` application can be confirmed.
5. Calling confirm several times on the same application must increase `confirmedSeats` only once (idempotent; return success on repeat).
6. No data loss on restart (`docker compose down` then `up`): use a named Postgres volume and apply migrations automatically on startup.

## Required implementation design

- **Concurrency:** inside a DB transaction, `SELECT ... FROM classes WHERE id = @id FOR UPDATE` to serialize per class, then expire stale holds of that class, count active holds, reject with `409 NO_SEATS` if full, otherwise insert. This also makes it safe with **two backend processes sharing one database**.
- **Time:** use the **database clock** (`now()`) for every expiry decision, never the application clock.
- **Expiry:** seat counts are **derived from rows**: `held = HELD AND expires_at > now()`, `confirmed = CONFIRMED`, `available = total - held - confirmed`. Status reads report `EXPIRED` when `status='HELD' AND expires_at <= now()`. Additionally run a `BackgroundService` that persists expiry every few seconds. Correctness must not depend on that sweeper.
- **Schema:** `classes(id, name, total_seats CHECK > 0, created_at)`; `holds(id, class_id FK, student_id char(17), status CHECK in the 4 values, created_at, expires_at, confirmed_at, cancelled_at)`; a **partial unique index** on `(class_id, student_id) WHERE status IN ('HELD','CONFIRMED')`; helpful indexes on `(class_id, status, expires_at)` and `(student_id)`.
- **Confirm:** lock, then: already `CONFIRMED` by the same student gives `200` with no change; `HELD` and unexpired becomes `CONFIRMED`; `HELD` but expired becomes `EXPIRED` and returns a `409` with code `HOLD_EXPIRED`; `CANCELLED`/`EXPIRED` returns `409`; another student's hold returns `404`.
- **Validation and errors:** `X-Student-Id` must be exactly 17 digits (otherwise `400 INVALID_STUDENT_ID`); blank name or seats <= 0 returns `400`; unknown IDs return `404`; already applied returns `409 ALREADY_APPLIED`; only `HELD` holds can be cancelled (cancelling `CONFIRMED` returns `409`). Error body: `{ "error": { "code": "...", "message": "human readable" } }`. Enable CORS for the frontend.

## Frontend requirements

- Top bar: student-ID input (17 digits, validated, persisted in `localStorage`).
- Screens: **Create class (admin)**, **Class list** (total/held/confirmed/available + "Apply" button), **Application** (status, live time remaining, "Pay admission fee" button, "Cancel" button), **My applications** (from `GET /me/holds`).
- Everything must be doable from the UI; no Postman or DB access should ever be needed.
- Class seat counts refresh **without a page reload** (poll every 3-5 seconds).
- When the hold's time runs out, show `EXPIRED` **without a page reload** and **disable** the "Pay admission fee" button. Compute the countdown from `expiresAt`, but also re-poll the server and trust the server status (the browser clock may be wrong).
- After a page refresh or reopening the browser, the student must still see their applications (student ID from `localStorage`, data from the server).
- Show **every** error (no seats, expired, already applied, invalid input, server unreachable) as a clear user-readable message in the UI. Never a blank page and never console-only. Add loading and empty states and a top-level error boundary.
- Design can be plain; correctness and usability matter more than looks.

## Docker

- `db`: `postgres:16`, named volume, `pg_isready` healthcheck.
- `backend`: multi-stage .NET build, port 8080, `depends_on` the healthy db, env vars for connection string and `HOLD_DURATION_SECONDS`.
- `frontend`: multi-stage Node build then nginx, exposed on port 3000, backend URL configurable.
- Verify: `docker compose down -v && docker compose up --build` works from scratch.

## Tests (backend, xUnit, real PostgreSQL, **not** the EF in-memory provider)

At least these:
1. **Concurrency:** class with 10 seats, ~100 parallel apply requests with different student IDs. Assert exactly 10 are `201`, 90 are `409`, and `availableSeats == 0`.
2. **Expiry:** with `HOLD_DURATION_SECONDS=1`, apply, wait about 2 s, assert the seat is free again and the hold reads `EXPIRED`.
3. **Idempotent confirm:** confirm twice; `confirmedSeats` is 1.
4. One active application per student per class; confirm after expiry fails; confirming another student's hold fails.
5. *(Bonus)* Two backend instances on different ports sharing one DB pass the same concurrency assertion.
6. *(Bonus)* Frontend tests (Vitest + React Testing Library): countdown flips to EXPIRED and disables Pay; an error alert is shown.

## Documentation to produce

- `README.md`: Docker-only run steps, frontend URL, API URL, env vars, how to run tests, a short manual walkthrough.
- `ASSUMPTIONS.md` (short): every assumption where the spec was silent, each with the reason (error codes, cancel rules, ID validation, duplicate class names, re-apply after cancel/expiry, DB-clock choice, and **how the row lock keeps `held + confirmed <= totalSeats` across multiple processes**).
- `AI_USAGE.md` (short): which tool was used for what, and **a concrete list of mistakes the AI made and how they were caught**. As you work, keep a running list of any bug or wrong decision you make or I point out, so this file can be written honestly at the end.

## Phases (commit after each)

1. Scaffold: repo layout, Dockerfiles, compose with db healthcheck.
2. Schema, migrations, `POST/GET /classes`, `GET /classes/{id}`.
3. Apply (hold) with the row lock and lazy expiry.
4. Confirm, cancel, `/me/holds`, validation, error format, CORS, background sweeper.
5. Backend tests (concurrency first), then run them repeatedly to check for flakiness.
6. Frontend shell, student-ID box, class list with polling.
7. Frontend application flow: apply, countdown, pay, cancel, my applications, error handling.
8. Docs (README, ASSUMPTIONS, AI_USAGE) and a clean-machine Docker check.
9. Bonus: multi-process test, frontend tests.

## Constraints

- Do not remove or rename any field in the API contract.
- Do not use the in-memory DB for the concurrency test.
- Do not rely on a background job for correctness.
- Do not add real payment, authentication, or extra features beyond this spec.
- Do **not** copy the original assignment PDF into the repository.
- After each phase, tell me what you built, what you assumed, and anything you are unsure about, before moving on.
