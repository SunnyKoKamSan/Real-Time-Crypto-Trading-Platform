# Milestone 3: Auth, Sessions, And Security Baseline

Branch: `feature/auth-sessions-security-baseline`

## Status

Implemented for the local paper-trading prototype.

Milestone 3 adds registration, login, refresh rotation, logout, protected `/api/me`, role support,
demo-balance seeding, Redis-backed auth rate limits, and a protected web console shell.

## Security Decisions

- Passwords use Argon2id hashes. Plaintext passwords are never stored.
- Access tokens are short-lived JWTs returned in JSON and held in frontend memory.
- Refresh tokens are opaque 256-bit bearer tokens stored only in an HTTP-only `SameSite=Lax` cookie.
- Refresh token hashes are stored in PostgreSQL; raw refresh tokens are never persisted or returned
  in JSON.
- CSRF tokens are returned in auth responses, held in frontend memory, hashed in `sessions`, and
  required on refresh/logout.
- Auth failures use safe public messages. Audit payloads carry internal reason codes without
  passwords, JWTs, refresh tokens, password hashes, or refresh hashes.
- Redis rate limiting uses an atomic sliding-window script. Redis failures fail open in
  development/test and fail closed in production.

## Implemented API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`

All responses use the standard API envelope and correlation IDs.

## Data Model

- `users.password_hash` is required.
- `users.role` is a strict `USER`/`ADMIN` enum.
- `sessions` tracks refresh-token hash, CSRF-token hash, token family, rotation links, revocation
  reason, last-used timestamp, request IP/user-agent metadata, and `updated_at`.
- Auth audit event types cover register, login success/failure, refresh, replay detection, logout,
  and session revocation.
- New-user demo balances are ledger-derived through `SYSTEM_MINT` rows with
  `reference_type = DEMO_BALANCE_SEED`.

## Frontend

- The API client uses `credentials: 'include'`.
- Access token and CSRF token live only in memory.
- Protected requests attach bearer access tokens and retry once after a successful refresh.
- Logout clears in-memory auth state and asks the API to clear the refresh cookie.
- The auth shell follows the dark operational console direction in `.impeccable.md`.

## Verification

Completed during implementation:

```bash
npm run lint
npm run typecheck
npm run test
npm -w @rtctp/web run build
NODE_ENV=test REDIS_URL=redis://localhost:6379 TEST_DATABASE_URL=postgres://trader:trader@localhost:5432/crypto_trading npm -w @rtctp/api run test
```
