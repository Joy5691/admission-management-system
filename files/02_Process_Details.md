# School Admission System: Detailed Process Plan

A step-by-step plan for building the take-home assignment. Deadline: **11 Nov 2026, 11:59:59 PM**. Aim to finish and push at least a few hours early.

---

## 1. The core problem (what is actually being tested)

The assignment looks like CRUD, but the real test is **correctness under concurrency**:

1. Thousands of requests hit a class with limited seats; `held + confirmed` must **never** exceed `totalSeats`.
2. Holds **expire on their own**; no API call, cron job or reload may be required for the seat to come back.
3. `confirm` must be **idempotent**.
4. Everything survives a restart.
5. The UI must stay honest: live counts, live countdown, readable errors.

Design every decision around these five points.

---

## 2. Architecture

```
repo/
├── backend/            # .NET 8 Web API (port 8080)
│   ├── Dockerfile
│   ├── src/...
│   └── tests/...       # xUnit incl. concurrency test
├── frontend/           # React 18 + Vite (+ TypeScript)
│   └── Dockerfile
├── docker-compose.yml  # postgres + backend + frontend
├── README.md
├── ASSUMPTIONS.md
└── AI_USAGE.md
```

| Layer | Choice | Why |
|---|---|---|
| API | ASP.NET Core 8 Minimal APIs or Controllers | Simple, fast to build |
| ORM | EF Core + Npgsql (raw SQL for the critical section) | Migrations are easy; raw SQL gives full control where it matters |
| DB | PostgreSQL 16 with a named volume | Row locks, partial unique indexes, persistence |
| Frontend | React 18 + Vite + TypeScript | Suggested by the brief |
| Serving | nginx container for the built frontend | Light and stable in Docker |

---

## 3. Data model

```sql
CREATE TABLE classes (
  id           uuid PRIMARY KEY,
  name         text        NOT NULL,
  total_seats  int         NOT NULL CHECK (total_seats > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE holds (
  id            uuid PRIMARY KEY,
  class_id      uuid        NOT NULL REFERENCES classes(id),
  student_id    char(17)    NOT NULL,
  status        text        NOT NULL CHECK (status IN ('HELD','CONFIRMED','EXPIRED','CANCELLED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  confirmed_at  timestamptz NULL,
  cancelled_at  timestamptz NULL
);

-- One active application per student per class (rule 3)
CREATE UNIQUE INDEX uq_active_hold_per_student_class
  ON holds (class_id, student_id)
  WHERE status IN ('HELD','CONFIRMED');

CREATE INDEX ix_holds_class_status ON holds (class_id, status, expires_at);
CREATE INDEX ix_holds_student ON holds (student_id);
```

IDs: use short prefixed strings (`c_…`, `h_…`) or plain GUIDs; the format is your choice per the brief.

---

## 4. The key design decisions

### 4.1 No overselling: lock the class row

Inside one transaction, take a row lock on the class, then count and insert:

```sql
BEGIN;
SELECT total_seats FROM classes WHERE id = @classId FOR UPDATE;   -- serializes per class
-- 1. lazily expire stale holds of this class
UPDATE holds SET status='EXPIRED'
 WHERE class_id=@classId AND status='HELD' AND expires_at <= now();
-- 2. count active seats
SELECT count(*) FROM holds WHERE class_id=@classId AND status IN ('HELD','CONFIRMED');
-- 3. if count >= total_seats  -> ROLLBACK, return 409 NO_SEATS
-- 4. INSERT hold (status HELD, expires_at = now() + HOLD_DURATION_SECONDS)
COMMIT;
```

- Requests for the **same class** queue on the row lock, so no race is possible.
- Requests for **different classes** do not block each other.
- It works across **multiple backend processes** because the lock lives in PostgreSQL. This directly satisfies the **bonus** (two processes, same DB).
- Use the **database clock** (`now()`) for all expiry logic, never the app clock. That removes clock-skew bugs between processes.

### 4.2 Expiry without any API call

Two layers, so correctness never depends on a background job:

1. **Lazy / read-time correctness (the source of truth).** Every seat count and status read treats `HELD AND expires_at <= now()` as expired:
   ```sql
   heldSeats      = count(*) WHERE status='HELD' AND expires_at >  now()
   confirmedSeats = count(*) WHERE status='CONFIRMED'
   availableSeats = totalSeats - heldSeats - confirmedSeats
   ```
   `GET /holds/{id}` and `GET /me/holds` report `EXPIRED` when `status='HELD'` and `expires_at <= now()`.
2. **Background sweeper (housekeeping).** A `BackgroundService` runs every few seconds and persists `UPDATE holds SET status='EXPIRED' WHERE status='HELD' AND expires_at <= now()`. This keeps the partial unique index tidy and the data clean, but nothing breaks if it is late.

> Without step 1, a student whose hold expired but was not yet swept would be blocked by the unique index. The apply transaction therefore expires stale holds for that class first (section 4.1, step 1).

### 4.3 Idempotent confirm

Inside a transaction, lock the class row and load the hold `FOR UPDATE`:

| Current state | Result |
|---|---|
| `CONFIRMED` (same student) | `200` with `CONFIRMED`; **no** second increment (the count comes from rows, not a counter) |
| `HELD` and `expires_at > now()` | set `CONFIRMED`, `confirmed_at = now()`, `200` |
| `HELD` and expired | mark `EXPIRED`, return `409`/`410` `HOLD_EXPIRED` |
| `CANCELLED` / `EXPIRED` | `409` with a clear code |
| Different student's hold | `404` (or `403`), never confirm someone else's |

Because seat counts are **derived from rows** and not from a mutable counter, "increase only once" holds automatically.

### 4.4 One active application per student per class

Enforced twice: an explicit check inside the transaction (friendly `409 ALREADY_APPLIED`), plus the partial unique index as a safety net.

### 4.5 Persistence

PostgreSQL data lives in a named Docker volume. `docker compose down` (without `-v`) keeps it. Apply EF migrations automatically at backend startup.

---

## 5. API behaviour (follow the contract exactly)

The 8 endpoints, the field names and the status codes come from the brief. Do **not** rename or drop fields. Extra fields are allowed.

Decisions to make and record in `ASSUMPTIONS.md`:

| Topic | Suggested decision |
|---|---|
| Missing/invalid `X-Student-Id` | `400` with code `INVALID_STUDENT_ID` (must be exactly 17 digits) |
| Unknown class/hold | `404` |
| Apply when no seats | `409` `NO_SEATS` (required by the brief) |
| Apply when student already active in class | `409` `ALREADY_APPLIED` |
| Invalid `POST /classes` body (blank name, seats ≤ 0) | `400` with field errors |
| Cancel a `CONFIRMED` admission | Not allowed: `409` (only `HELD` can be cancelled) |
| Cancel a hold that is not the caller's | `404` |
| Re-apply after cancel/expiry | Allowed (the partial index only covers active states) |
| Duplicate class names | Allowed (or `409`); pick one and document it |
| Error body shape | `{ "error": { "code": "...", "message": "..." } }`, human-readable message |
| CORS | Allow the frontend origin |
| `GET /classes` ordering | By `created_at` |

---

## 6. Frontend plan

**Layout:** a top bar with the **Student ID input** (17 digits, validated, saved in `localStorage`), and tabs for *Classes*, *My Applications* and *Admin: Create Class*.

| Screen | Behaviour |
|---|---|
| Admin: Create class | Name + seat count form, inline validation, success message |
| Class list | Cards or table with total / held / confirmed / available; **polls every 3 to 5 s**; "Apply" disabled when 0 available or the student has no ID |
| Application detail | Status badge, **live countdown** from `expiresAt`, "Pay admission fee", "Cancel" |
| My applications | From `GET /me/holds`; each row links to its detail; refreshes by polling |

Key UI rules:

- **Countdown:** compute remaining time from `expiresAt`. When it hits zero, flip the display to `EXPIRED` and disable "Pay" immediately, with no reload. Also re-fetch the hold from the server at that moment to confirm.
- **Server-time skew:** the browser clock may be wrong. Re-poll `GET /holds/{id}` every few seconds and trust the server status over the local timer.
- **Persistence:** because the student ID is in `localStorage` and applications come from the server, a refresh or reopened browser shows the current applications again.
- **Errors:** map API error codes to friendly messages (no seats, expired, already applied, invalid ID, server unreachable). Show them in a visible alert, never only in the console. Add a top-level error boundary.
- **Loading/empty states** for every list.
- Config: backend URL via an environment variable. Note that Vite variables are **build-time**; either pass a build arg in Docker or serve a runtime `config.js` from nginx.

---

## 7. Docker

`docker-compose.yml` with three services:

1. `db`: `postgres:16`, a named volume, and a `healthcheck` (`pg_isready`).
2. `backend`: builds `backend/`, port `8080:8080`, env `ConnectionStrings__Default`, `HOLD_DURATION_SECONDS`; `depends_on: db: condition: service_healthy`; applies migrations on start.
3. `frontend`: builds `frontend/` (multi-stage: node build, then nginx), exposes e.g. `3000:80`, with the backend URL configurable.

Check from a clean machine: `docker compose down -v && docker compose up --build` must work with nothing else installed.

---

## 8. Testing plan (minimum 3 backend tests, one concurrency)

Use xUnit with `WebApplicationFactory` and a real PostgreSQL (Testcontainers, or the compose DB). Do not use the in-memory provider, because it has no row locks.

1. **Concurrency test (required).** Class with 10 seats; fire ~100 parallel `POST /classes/{id}/holds` with different student IDs. Assert exactly 10 `201` and 90 `409`, and `heldSeats == 10`, `availableSeats == 0`.
2. **Expiry test.** Set `HOLD_DURATION_SECONDS=1`; apply, wait ~2 s, assert the seat is available again and the hold reads `EXPIRED` without any API action in between.
3. **Idempotent confirm test.** Confirm twice; both return success, `confirmedSeats` is 1.
4. **One active per student.** Second apply by the same student in the same class returns `409`.
5. **Confirm after expiry fails**, and **confirming another student's hold fails**.
6. *(Bonus)* Two app instances on different ports against one DB, then the same concurrency assertion.
7. *(Bonus)* Frontend tests with Vitest + React Testing Library (countdown flips to EXPIRED, error alert shows).

---

## 9. Suggested schedule (deadline 11 Nov, 11:59 PM)

| Block | Work | Commit message example |
|---|---|---|
| 1 | Repo, solution skeleton, Dockerfiles, compose with db, health check | `chore: scaffold backend, frontend, compose` |
| 2 | Schema, migrations, `POST/GET /classes` | `feat(api): classes endpoints` |
| 3 | Holds: apply with row lock, lazy expiry | `feat(api): hold seats with row-level locking` |
| 4 | Confirm, cancel, `/me/holds`, error format, validation | `feat(api): confirm, cancel, my holds` |
| 5 | Sweeper, tests (concurrency first) | `test: concurrency, expiry, idempotency` |
| 6 | Frontend: shell, student ID, class list + polling | `feat(ui): class list with live seats` |
| 7 | Frontend: apply flow, countdown, pay, cancel, my applications, errors | `feat(ui): application flow` |
| 8 | Docs: README, ASSUMPTIONS, AI_USAGE; clean-machine docker test | `docs: readme, assumptions, ai usage` |
| 9 | Bonus: multi-process check, frontend tests | `test(ui): ...` |

Commit as you go. The brief explicitly asks for commit history, not one big commit.

---

## 10. Documentation to write

### README.md
- Prerequisite: Docker only.
- Run: `docker compose up --build`.
- URLs: frontend `http://localhost:3000`, API `http://localhost:8080`.
- Env vars: `HOLD_DURATION_SECONDS`, DB connection string, frontend API URL.
- How to run tests (backend, and frontend if done).
- Quick manual walkthrough (create class, apply, pay, expire).

### ASSUMPTIONS.md (short; each item says what and why)
- The decisions in section 5's table.
- Seats are counted from rows, with expired holds ignored at read time.
- DB clock is used for expiry.
- How the row lock keeps `held + confirmed <= totalSeats` across processes (**bonus answer**).
- Student ID is validated as exactly 17 digits, with no further check.
- Unauthenticated admin screen (the brief has no login).

### AI_USAGE.md (short)
- Tool(s) used and for which parts.
- **Concrete mistakes the AI made and how you caught them.** Keep a running note while building. Typical catches: counting seats with a non-atomic read-then-write, using in-memory DB for the concurrency test, using app time instead of DB time, forgetting idempotent confirm, Vite env being build-time only.

---

## 11. Pre-submission checklist

- [ ] `docker compose down -v && docker compose up --build` works on a clean checkout
- [ ] Frontend opens at the documented URL and talks to `http://localhost:8080`
- [ ] All 8 endpoints match the contract (field names, status codes, headers)
- [ ] Concurrency test passes repeatedly (run it 10 times)
- [ ] Expiry works with no API calls; the UI flips to `EXPIRED` without a reload
- [ ] Seat counts update live; refresh keeps the student's applications
- [ ] Data survives `docker compose down` then `up`
- [ ] Every error is shown as a readable message in the UI
- [ ] README, ASSUMPTIONS, AI_USAGE present
- [ ] Repo is **public**, has commit history, contains `backend/` and `frontend/`
- [ ] Assignment PDF is **not** in the repo
- [ ] Repo link submitted at `https://q-rp.com/c/4CXx` before the deadline
