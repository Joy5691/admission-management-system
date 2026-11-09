# School Admission System: Take-Home Assignment (English Translation)

**Company:** Onnorokom Projukti Limited (Confidential)
**Position:** Assistant Software Engineer
**Deadline:** 11 November 2026, 11:59:59 PM
**Stack:** .NET 8+ · PostgreSQL · React 18+ · Docker
**Submit via:** your own public GitHub repository

---

## 1. Assignment: School Admission System

### 1.1 Situation

A private school will take admissions online for the new academic year. Admission is **first come, first served**, with no lottery. Every class has limited seats **per shift** (for example, "Class 6 – Morning Shift" has 120). The moment admissions open, thousands of guardians apply at the same time.

When someone applies, a seat is **held** in the student's name for a limited time. If the admission fee is paid within that time, the admission is **confirmed**. If the fee is not paid in time, the seat opens up again for others.

You must build **both the backend and the React UI** of this admission system. The school admin and the guardians do everything from the UI.

> **Note:** The brief does not spell everything out. Where something is unclear, make the assumption you find reasonable, proceed, and write it down with reasons in `ASSUMPTIONS.md`.

### 1.2 Technology

- **Backend:** C# (.NET 8 or newer) and PostgreSQL. ORM of your choice.
- **Frontend:** React 18 or newer, JavaScript or TypeScript. Starting with Vite is suggested. UI library of your choice.
- The backend runs at `http://localhost:8080`. The database connection must be changeable through an environment variable.
- The backend URL used by the frontend must be changeable through an environment variable.
- The whole project runs on Docker. Keep a `docker-compose.yml` in the repository root so that just `docker compose up` starts PostgreSQL, the backend and the frontend together. Nothing except Docker will be installed on our machine. This is how we will run the app.
- AI tools may be used.

### 1.3 What the UI must contain

A class can have several shifts. In this system, **every shift is created as its own separate "class"**, with its own seat count. For example, "Class 6 – Morning Shift" and "Class 6 – Day Shift" are two different classes.

There is **no login**. A box at the top of the page lets the user enter the student's **birth registration number**. The UI uses this as the student's identity.

| Screen | Purpose |
|---|---|
| Create class (school admin) | Create a new class with a name and a seat count |
| Class list | For each class: total, held, confirmed and available seats; an "Apply" button |
| Application | Status, time remaining until expiry, a "Pay admission fee" button and a "Cancel" button |
| My applications | All of this student's applications and the status of each |

Pressing "Pay admission fee" is treated as a successful payment. **No real payment gateway is needed.**

The UI does not need to look beautiful. What matters is that it works correctly and is easy to use.

### 1.4 API

The UI will call these APIs. **You must follow the contract exactly**, because besides the UI we will also run automated tests directly against the API. You may *add* extra fields to a response, but you may **not remove or rename** any field listed below.

**Base URL:** `http://localhost:8080`. All requests and responses are JSON. The student's identity comes in the `X-Student-Id` header, whose value is the student's **17-digit birth registration number**. In the API too, every shift is a separate "class" (see §1.3). IDs in the examples (`c_123`, `h_789`) are only examples; the ID format is your choice.

| # | Method & Path | Purpose |
|---|---|---|
| 1 | `POST /classes` | Create a new class |
| 2 | `GET /classes` | List all classes, with seat counts |
| 3 | `GET /classes/{classId}` | Seat status of one class |
| 4 | `POST /classes/{classId}/holds` | Apply (hold a seat) |
| 5 | `GET /holds/{holdId}` | Current status of an application |
| 6 | `POST /holds/{holdId}/confirm` | Pay the admission fee, confirm admission |
| 7 | `DELETE /holds/{holdId}` | Cancel an application |
| 8 | `GET /me/holds` | All applications of this student |

#### 1. `POST /classes`

```jsonc
// request
{ "name": "Class 6 - Morning Shift", "totalSeats": 120 }

// 201 response
{ "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120 }
```

#### 2. `GET /classes`

```jsonc
// 200 response
[
  { "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120, "heldSeats": 15, "confirmedSeats": 80, "availableSeats": 25 }
]
```

#### 3. `GET /classes/{classId}`

```jsonc
// 200 response
{ "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120, "heldSeats": 15, "confirmedSeats": 80, "availableSeats": 25 }
```

#### 4. `POST /classes/{classId}/holds`

Header: `X-Student-Id`

```jsonc
// 201 response
{
  "holdId": "h_789",
  "classId": "c_123",
  "studentId": "20152691234567890",
  "status": "HELD",
  "expiresAt": "2026-11-01T04:10:00Z"
}
```

If no seat is available, return `409`.

#### 5. `GET /holds/{holdId}`

```jsonc
// 200 response
{ "holdId": "h_789", "classId": "c_123", "status": "HELD", "expiresAt": "2026-11-01T04:10:00Z" }
```

`status` can be `HELD`, `CONFIRMED`, `EXPIRED` or `CANCELLED`.

#### 6. `POST /holds/{holdId}/confirm`

Header: `X-Student-Id`

```jsonc
// 200 response
{ "holdId": "h_789", "status": "CONFIRMED" }
```

#### 7. `DELETE /holds/{holdId}`

Header: `X-Student-Id`. Returns `204` on success.

#### 8. `GET /me/holds`

Header: `X-Student-Id`

```jsonc
// 200 response
[
  { "holdId": "h_789", "classId": "c_123", "className": "Class 6 - Morning Shift", "status": "HELD", "expiresAt": "2026-11-01T04:10:00Z" }
]
```

### 1.5 Rules (mandatory)

**Backend**

- Under no circumstances may `held + confirmed` in a class exceed `totalSeats`, no matter how many requests arrive at the same time.
- The application hold duration is set by the environment variable `HOLD_DURATION_SECONDS` (default `600`). When it runs out, the seat must return **by itself**, without anyone calling any API.
- A student cannot have more than one active application or confirmed admission in the same class at the same time.
- Only your own, not-yet-expired `HELD` application can be confirmed.
- If confirm is called more than once on the same application, `confirmedSeats` must increase only once.
- No data may be lost when the app restarts, even after `docker compose down` followed by `docker compose up`.

**UI**

- Everything must be doable from the UI. Postman or direct database access must not be needed anywhere.
- When the time runs out, the application must show as `EXPIRED` **without a page reload**, and the "Pay admission fee" button must be disabled.
- The seat counts of a class must update **without a page reload**, every few seconds.
- If the page is refreshed, or the browser is closed and reopened, the student must still see their current applications.
- Any error (no seats, expired, wrong input, server down) must be shown in language a user can understand. A blank page, or an error only in the console, is not acceptable.

### 1.6 Bonus (optional)

- If two backend processes run at the same time on different ports with the same database, `held + confirmed` must still never exceed `totalSeats`. Explain in `ASSUMPTIONS.md` how you ensured this.
- Automated tests for the frontend.

### 1.7 What to submit

- One Git repository with commit history, containing `backend/` and `frontend/` folders. Commit along with the work, not as one big commit at the end.
- A `Dockerfile` for the backend and for the frontend, and a `docker-compose.yml` in the repository root (see §1.2).
- `README.md`: the steps to run the app with Docker, the URL where the frontend opens, and how to run the tests.
- `ASSUMPTIONS.md` (short): what you assumed where the spec was unclear, and why.
- At least **3 automated tests** in the backend, one of which must be a **concurrency test**. A concurrency test sends many requests at once and shows that no more holds are made than there are seats.
- `AI_USAGE.md` (short): which AI tool you used, for which parts, where the AI made mistakes, and how you caught them.

---

## 2. Submitting the Project

- Create a **public** repository in your own GitHub account and keep all the work there.
- Submit the repository link through the submission link below, before the deadline.
- We will evaluate the repository **in the state it is in at the deadline**. Any commit or push after that will not be counted.
- Do not make this assignment PDF public, and do not share it with anyone.

**Submit the project:** when the project is finished, submit it via `https://q-rp.com/c/4CXx`

If you have any problem submitting, contact `hrd@onnorokom.com`.

*Thank you, and best of luck!*
