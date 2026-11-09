# Phase 4 checklist
# [x] POST /holds/{holdId}/confirm  — idempotent, row lock, expiry detection
# [x] DELETE /holds/{holdId}         — cancel HELD only
# [x] GET /me/holds                  — by X-Student-Id
# [x] X-Student-Id validation (17 digits) in all endpoints
# [x] CORS policy for http://localhost:3000
# [x] ErrorHandlingMiddleware (global 500 handler)
# [x] HoldExpiryService BackgroundService (5s sweep, UPDATE … WHERE expires_at <= now())
