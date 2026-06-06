# Local Development Runbook

## Required Tools

- Node.js 20.19 or newer.
- npm.
- Docker Desktop or a compatible Docker engine.
- Git.

## First Setup

```bash
npm install
cp .env.example .env
```

## Start Local Infrastructure

```bash
npm run infra:up
docker compose ps
```

PostgreSQL defaults to:

```text
postgres://trader:trader@localhost:5432/crypto_trading
```

Override with `DATABASE_URL` when needed.

The compose stack exposes:

| Service            | URL or port              |
| ------------------ | ------------------------ |
| PostgreSQL         | `localhost:5432`         |
| Redis              | `localhost:6379`         |
| Redpanda Kafka API | `localhost:9092`         |
| Redpanda Admin API | `http://localhost:9644`  |
| Prometheus         | `http://localhost:9090`  |
| Grafana            | `http://localhost:3000`  |
| Jaeger             | `http://localhost:16686` |
| OTLP HTTP          | `http://localhost:4318`  |
| OTLP gRPC          | `localhost:4317`         |

Grafana local credentials are `admin` / `admin`.

## Migrate And Seed

```bash
npm run db:migrate
npm run db:seed
```

Generate a new migration after schema edits:

```bash
npm run db:generate
```

The seed is idempotent. It creates BTC/ETH symbols, admin/dev users, demo users, and initial paper balances through `ledger_entries` with `SYSTEM_MINT`.

Seeded local accounts use `SEED_DEMO_PASSWORD`, defaulting to:

```text
LocalDemoPassword!2026
```

Seeded users:

- `admin@rtctp.local` / `ADMIN`
- `dev@rtctp.local` / `ADMIN`
- `demo.alice@rtctp.local` / `USER`
- `demo.bob@rtctp.local` / `USER`

## Start The App

Preferred one-command startup:

```bash
npm run dev
```

The root `dev` script starts Docker Compose infrastructure, then runs the API and web dev servers in one process group. Stop it with `Ctrl+C`. Use separate terminals only when debugging one service at a time:

```bash
npm run dev:api
npm run dev:web
```

Current local URLs:

- API: `http://localhost:4000`
- Web: `http://127.0.0.1:5173`
- WebSocket: `ws://localhost:4000/ws`

## Auth Configuration

Local auth defaults are suitable for development only:

```bash
JWT_SECRET=local-development-jwt-secret-change-before-production
JWT_ISSUER=rtctp-api
JWT_AUDIENCE=rtctp-web
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
AUTH_COOKIE_NAME=rtctp_refresh
AUTH_COOKIE_SECURE=false
CSRF_HEADER_NAME=x-csrf-token
REDIS_URL=redis://localhost:6379
```

Use `AUTH_COOKIE_SECURE=true` outside local HTTP development. Refresh tokens are HTTP-only cookies;
frontend code only stores the access token and CSRF token in memory. A browser reload loses the
in-memory CSRF token, so the local app signs in again rather than persisting sensitive auth state.

## Smoke Checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/symbols
curl http://localhost:9090/-/healthy
curl http://localhost:3000/api/health
curl http://localhost:16686/
curl http://localhost:9644/v1/status/ready
```

All backend JSON responses return the standard API envelope.

## Quality Gates

Run these before treating a milestone as complete:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The GitHub Actions workflow runs the same four commands after `npm ci`. `npm run test` also runs `npm run test:boundaries`, which creates temporary illegal imports and verifies that ESLint blocks the workspace boundary violations.

## Test With PostgreSQL

Normal tests run without requiring a database. To run integration tests against a disposable database URL:

```bash
TEST_DATABASE_URL=postgres://trader:trader@localhost:5432/crypto_trading npm -w @rtctp/api run test
```

The integration tests reset the `public` schema for the configured `TEST_DATABASE_URL`.

## Reconstruct Balances

```sql
select user_id, asset, coalesce(sum(amount), 0)::numeric(20, 8) as balance
from ledger_entries
group by user_id, asset;
```

Ledger entries are historical facts. Do not update old rows to change a balance; append a compensating entry instead.

Ledger signs are part of the schema contract: `SYSTEM_MINT` and `ORDER_RELEASE` must be positive, `ORDER_RESERVE` and `FEE` must be negative, and `TRADE_SETTLEMENT` is signed according to the asset-side balance effect.

## Stop Local Infrastructure

```bash
docker compose down
```

To remove local database and Grafana volumes:

```bash
docker compose down -v
```
