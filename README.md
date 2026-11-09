# School Admission System — Backend

> .NET 10 Web API + PostgreSQL 16 + EF Core 9 + Npgsql

## Quick Start

```bash
docker-compose up --build
```

API base URL: `http://localhost:8080`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/classes` | Create a class |
| GET | `/classes` | List all classes |
| GET | `/classes/{classId}` | Get one class |
| POST | `/classes/{classId}/holds` | Hold a seat |
| GET | `/holds/{holdId}` | Get hold details |
| POST | `/holds/{holdId}/confirm` | Confirm a hold |
| DELETE | `/holds/{holdId}` | Cancel a hold |
| GET | `/me/holds` | My holds |

## Headers

- `X-Student-Id`: 17-digit student identifier (required for hold/confirm/cancel endpoints)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ConnectionStrings__Default` | — | PostgreSQL connection string |
| `HOLD_DURATION_SECONDS` | `600` | Seconds before a hold expires |

## Architecture

```
backend/
  src/SchoolAdmission/
    Data/           → AppDbContext (EF Core + raw SQL schema creation)
    Models/         → Class, Hold entities
    Endpoints/      → ClassesEndpoints, HoldsEndpoints (Minimal API)
    Middleware/     → ErrorHandlingMiddleware
    Services/       → HoldExpiryService (BackgroundService, 5s sweep)
```

## Concurrency

Seat holds use PostgreSQL row-level locking (`SELECT … FOR UPDATE`) to prevent double-booking under concurrent load. All DB timestamps use `now()` (server clock), never the application clock.
