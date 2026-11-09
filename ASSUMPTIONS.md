# System Assumptions and Technical Decisions

This document details all domain, architectural, and design assumptions where the specification was silent or allowed discretion, along with the reasoning for each.

---

## 1. Concurrency Control and Multi-Process Safety

### Assumption: PostgreSQL Row-Level Lock (`SELECT ... FOR UPDATE`)
- **Mechanism:** When holding a seat (`POST /classes/{classId}/holds`), the transaction executes `SELECT total_seats FROM classes WHERE id = @classId FOR UPDATE`.
- **Reasoning:**
  - This row lock serializes all incoming hold requests for a specific class at the PostgreSQL database level.
  - Concurrent requests for the same class queue up deterministically on the class row; each transaction reads the latest committed count of active holds (`HELD` within expiry + `CONFIRMED`).
  - Requests for *different* classes do not block each other, maximizing throughput.
  - **Multi-Process Safety (Bonus Requirement):** Because the lock is held inside the database engine, multiple backend processes (running on different ports, containers, or host machines) connected to the same PostgreSQL instance are serialized identically. No distributed lock (like Redis) or application-level mutex is required.

---

## 2. Expiry Mechanism and Clock Source

### Assumption: Database Clock (`now()`) as Single Source of Truth
- **Mechanism:** All expiry calculations and comparisons strictly use PostgreSQL's `now()` (e.g. `expires_at = now() + @dur * interval '1 second'`, `expires_at <= now()`).
- **Reasoning:**
  - Application server clocks can suffer from clock drift or timezone misconfiguration, especially when multiple backend containers run simultaneously.
  - Using the DB server's clock guarantees 100% consistent expiry evaluation across all instances without requiring NTP clock synchronization between containers.

### Assumption: Lazy Expiry with Periodic Background Sweeper
- **Mechanism:** Correctness does **not** depend on background jobs. All read and write queries lazily evaluate holds as expired when `status = 'HELD' AND expires_at <= now()`. A `BackgroundService` runs every 5 seconds solely as a garbage-collection optimization to persist `status = 'EXPIRED'`.
- **Reasoning:**
  - If a background job is delayed or paused (e.g., during high CPU load), active seat counts and hold statuses remain completely accurate in real-time.
  - During `POST /classes/{classId}/holds`, stale holds are updated in the same transaction before seat counting, freeing up seats immediately.

---

## 3. ID Validation and Student Identity

### Assumption: Exactly 17 Numeric Digits
- **Validation Rule:** The `X-Student-Id` header must consist of exactly 17 ASCII digits (`^\d{17}$`).
- **Error Response:** Any request with a missing or non-compliant `X-Student-Id` returns HTTP `400 Bad Request` with `{ "error": { "code": "INVALID_STUDENT_ID", "message": "X-Student-Id must be exactly 17 digits." } }`.
- **Reasoning:**
  - In Bangladesh, birth registration numbers (BRN) are officially 17 numeric digits.
  - Validating length and character set prevents empty or malformed identifiers from polluting DB indexes.

---

## 4. Application Rules and State Transitions

### Assumption: Re-Apply Permitted After Cancel or Expiry
- **Rule:** A student who previously held a seat that expired or was cancelled is permitted to apply again for the same class.
- **Enforcement:** The database maintains a partial unique index:
  ```sql
  CREATE UNIQUE INDEX uq_active_hold_per_student_class
    ON holds (class_id, student_id)
    WHERE status IN ('HELD', 'CONFIRMED');
  ```
  Since `EXPIRED` and `CANCELLED` rows are excluded from this index, students can re-apply once their previous hold is no longer active.

### Assumption: Cancellation Permitted for `HELD` Only
- **Rule:** A student can only cancel an application while it is in the `HELD` state.
- **Error Response:** Calling `DELETE /holds/{holdId}` on a `CONFIRMED` admission returns HTTP `409 Conflict` with code `HOLD_CONFIRMED`.
- **Reasoning:**
  - Once admission is confirmed and paid, cancellation requires school administrative review and fee refund handling, rather than automated self-service cancellation.

### Assumption: Confirming Another Student's Hold Returns `404`
- **Rule:** If Student A attempts to confirm (`POST /holds/{holdId}/confirm`) a hold owned by Student B, the API returns HTTP `404 Not Found` (rather than revealing the existence of another student's hold via 403).
- **Reasoning:**
  - Prevents enumeration and unauthorized status inspection of other students' applications.

---

## 5. Idempotent Confirmation

### Assumption: Re-confirming a `CONFIRMED` Hold Returns `200 OK`
- **Mechanism:** If `POST /holds/{holdId}/confirm` is invoked on an already confirmed hold by the same student, the system returns HTTP `200 OK` with `{ "holdId": "...", "status": "CONFIRMED" }`.
- **Reasoning:**
  - Guards against network retries or double-clicks by guardians.
  - Because seat counts are derived by aggregating rows (`COUNT(*) FILTER (WHERE status = 'CONFIRMED')`), repeated confirmations never inflate the confirmed seat tally.

---

## 6. Duplicate Class Names

### Assumption: Duplicate Class Names Allowed
- **Rule:** Multiple classes can share the same display name if created separately.
- **Reasoning:**
  - Different shifts or sections may be created incrementally by administrators.
  - Each class is distinctly identified by its unique `UUID` primary key.

---

## 7. API Error Contract

### Assumption: Standardized JSON Error Format
- **Shape:** All error responses follow the shape:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable description"
    }
  }
  ```
- **Error Codes Used:**
  - `INVALID_STUDENT_ID` (400)
  - `INVALID_NAME` (400)
  - `INVALID_SEATS` (400)
  - `CLASS_NOT_FOUND` (404)
  - `HOLD_NOT_FOUND` (404)
  - `NO_SEATS` (409)
  - `ALREADY_APPLIED` (409)
  - `HOLD_EXPIRED` (409)
  - `HOLD_CANCELLED` (409)
  - `HOLD_CONFIRMED` (409)
  - `INTERNAL_ERROR` (500)
