# School Admission System

A production-grade, concurrent school admission system built with **.NET 10**, **PostgreSQL 16**, and **React 18 + Vite + TypeScript**, designed to safely handle thousands of simultaneous applicants without overselling seats.

---

## 🎯 System Overview

- **First come, first served:** Seats are held on application and finalized upon payment.
- **Strict Concurrency Safety:** Class seat limits are protected by PostgreSQL row-level locks (`SELECT ... FOR UPDATE`), ensuring `held + confirmed <= totalSeats` under arbitrary concurrent traffic across single or multiple backend instances.
- **Automatic Expiry:** Holds automatically expire after `HOLD_DURATION_SECONDS` (default: 600s / 10 minutes) without requiring external triggers or API calls.
- **Server Clock Authority:** Expiry and availability rely strictly on PostgreSQL's `now()` database clock.
- **No Login:** Students identify themselves by entering their 17-digit birth registration number in the UI top bar (transmitted via `X-Student-Id` HTTP header).

---

## 🚀 Quick Start (Docker Only)

Only **Docker** and **Docker Compose** are required to run the entire system.

### 1. Start all services
```bash
docker compose up --build
```

This starts:
- **`db`** (`postgres:16`): PostgreSQL database with persistent named volume `pgdata` and automated health check.
- **`backend`** (`.NET 10 Web API`): Listens on `http://localhost:8080`.
- **`frontend`** (`React 18 + nginx`): Served on `http://localhost:3000`.

### 2. Access the Application
- **Frontend UI:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8080](http://localhost:8080)

### 3. Stop services (preserving data)
```bash
docker compose down
```

### 4. Reset completely (clean-slate testing)
```bash
docker compose down -v && docker compose up --build
```

---

## 🔧 Environment Variables

| Variable | Service | Default | Description |
|---|---|---|---|
| `ConnectionStrings__Default` | Backend | `Host=db;Port=5432;Database=admissions;...` | PostgreSQL connection string |
| `HOLD_DURATION_SECONDS` | Backend | `600` | Seat hold duration in seconds |
| `ASPNETCORE_URLS` | Backend | `http://+:8080` | ASP.NET Core listening address |
| `BACKEND_URL` | Frontend | `http://localhost:8080` | Runtime backend URL injected into `/config.js` |

---

## 🧪 Running Automated Tests

The backend test suite uses **xUnit** and **Testcontainers** with a real PostgreSQL database (never an in-memory database) to verify correctness under actual database transactions and row locks.

```bash
# From repository root:
dotnet test backend/SchoolAdmission.sln -c Release
```

### Test Coverage Highlights:
1. **Concurrency (`ConcurrencyTests.cs`):** Creates a class with 10 seats and fires **100 parallel requests** with distinct student IDs simultaneously. Verifies that **exactly 10 succeed (201)**, **90 fail with 409 Conflict (NO_SEATS)**, and available seats become 0.
2. **Expiry (`ExpiryTests.cs`):** Configures `HOLD_DURATION_SECONDS=1`, applies for a seat, waits 2 seconds, and asserts that the hold automatically transitions to `EXPIRED` and the seat is returned to `availableSeats` without manual intervention.
3. **Idempotent Confirm (`ConfirmTests.cs`):** Confirms an application twice in succession; verifies both calls succeed with status 200 and confirmed seat count remains exactly 1.
4. **Hold Rules (`HoldRulesTests.cs`):**
   - Single active application per student per class (`409 ALREADY_APPLIED`).
   - Confirming another student's hold returns `404 Not Found`.
   - Only `HELD` holds can be cancelled (`204 No Content`); cancelling a `CONFIRMED` admission returns `409 Conflict`.
   - Students can apply again after previous hold expires or is cancelled.

---

## 📖 Manual Walkthrough

Follow these steps in the web UI at `http://localhost:3000`:

1. **Set Student Identity:**
   - In the top bar, enter a 17-digit student ID (e.g. `20152691234567890`).
   - Notice the green checkmark "✓ ID set". This ID is stored in `localStorage` and remembered on page reload.

2. **Create a Class (Admin Screen):**
   - Click the **Admin: Create Class** tab.
   - Enter Class Name: `Class 6 - Morning Shift`, Total Seats: `5`.
   - Click **Create Class**. A confirmation banner appears with the generated Class ID.

3. **Apply for a Seat:**
   - Switch to the **Classes** tab.
   - You will see `Class 6 - Morning Shift` with 5 Total, 0 Held, 0 Confirmed, 5 Available seats.
   - Click **Apply**.
   - You are immediately redirected to the **Application Detail** screen.

4. **Observe the Live Countdown:**
   - The status badge shows **HELD** in orange.
   - A live countdown timer shows the remaining time before expiry (e.g., `09:59`).
   - Notice the background polling keeps the status in sync with the server.

5. **Confirm Admission (Pay Fee):**
   - Click the green **Pay Admission Fee** button.
   - Status updates instantly to **Admission Confirmed** (green badge).
   - "Pay Admission Fee" and "Cancel" buttons are disabled.

6. **View "My Applications":**
   - Click the **My Applications** tab.
   - Your confirmed application appears in the table with class name, status, and expiry details.
   - Click **View** to inspect the application details at any time.

7. **Test Automatic Expiry (Optional):**
   - Enter another 17-digit ID (e.g., `20152691234567891`).
   - On a class with available seats, click **Apply**.
   - If `HOLD_DURATION_SECONDS` runs out, the badge flips to **Hold Expired** (red) without a page reload and the payment button is disabled.

---

## 📡 API Contract Reference

Base URL: `http://localhost:8080` (all requests & responses in JSON)

| Method | Endpoint | Headers | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/classes` | — | Create class | `201 Created`, `400 Bad Request` |
| `GET` | `/classes` | — | List all classes with seat counts | `200 OK` |
| `GET` | `/classes/{classId}` | — | Get single class seat status | `200 OK`, `404 Not Found` |
| `POST` | `/classes/{classId}/holds` | `X-Student-Id` | Apply for a seat (hold) | `201 Created`, `400`, `404`, `409 Conflict` |
| `GET` | `/holds/{holdId}` | — | Application status | `200 OK`, `404 Not Found` |
| `POST` | `/holds/{holdId}/confirm` | `X-Student-Id` | Pay fee & confirm admission | `200 OK`, `400`, `404`, `409 Conflict` |
| `DELETE` | `/holds/{holdId}` | `X-Student-Id` | Cancel an active hold | `204 No Content`, `400`, `404`, `409 Conflict` |
| `GET` | `/me/holds` | `X-Student-Id` | View all holds for student | `200 OK`, `400 Bad Request` |
