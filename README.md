# Real-Time Crypto Trading Platform

Local-first TypeScript monorepo for a paper-trading crypto platform. The repository is currently in
Milestone 1: architecture lock, workspace guardrails, documentation baseline, and CI verification.

This is not a real-money exchange. Deposits, withdrawals, custody, external order routing, and
payment processing are out of scope.

## Current Repository Map

| Path              | Purpose                                                       | Allowed internal dependency |
| ----------------- | ------------------------------------------------------------- | --------------------------- |
| `packages/domain` | Shared schemas, enums, DTO types, and deterministic invariants | None                        |
| `apps/api`        | Express API and WebSocket gateway                             | `@rtctp/domain` public API  |
| `apps/web`        | React/Vite trading console preview                            | `@rtctp/domain` public API  |

Workspace boundaries are enforced by npm workspaces, TypeScript references, package exports, and
ESLint `no-restricted-imports`. Application code must not import another app or reach into
`packages/domain/src/*`.

## Implemented Now

- npm workspaces for `apps/api`, `apps/web`, and `packages/domain`.
- Express API with `/health`, `/api/symbols`, `/api/system/info`, request logging, and correlation
  IDs.
- Unified JSON envelopes with `meta.correlationId` and nanosecond ISO timestamps derived from
  `process.hrtime.bigint()`.
- WebSocket skeleton at `/ws`.
- React/Vite paper-trading dashboard shell with fixture BTC/ETH data.
- Docker Compose for PostgreSQL, Redis, Redpanda, Prometheus, Grafana, and Jaeger.
- CI workflow running lint, typecheck, tests, and build.
- ADRs, runbooks, API/event/data-model docs, code-review checklist, and milestone backlog.

Not implemented yet: auth, migrations, live market ingestion, order placement, matching, ledger
settlement, outbox workers, production dashboards, e2e tests, and load tests.

## Local Ports

| Component          | URL or port                 |
| ------------------ | --------------------------- |
| API                | `http://localhost:4000`     |
| Web                | `http://127.0.0.1:5173`     |
| WebSocket          | `ws://localhost:4000/ws`    |
| PostgreSQL         | `localhost:5432`            |
| Redis              | `localhost:6379`            |
| Redpanda Kafka API | `localhost:9092`            |
| Redpanda Admin API | `http://localhost:9644`     |
| Prometheus         | `http://localhost:9090`     |
| Grafana            | `http://localhost:3000`     |
| Jaeger             | `http://localhost:16686`    |
| OTLP HTTP          | `http://localhost:4318`     |
| OTLP gRPC          | `http://localhost:4317`     |

Grafana local credentials are `admin` / `admin`.

## Setup

Required:

- Node.js 20.19 or newer.
- npm.
- Docker Desktop or compatible Docker Engine.

Install dependencies and create local environment config:

```bash
npm install
cp .env.example .env
```

Start infrastructure plus API and web dev servers:

```bash
npm run dev
```

Or run the pieces separately:

```bash
npm run infra:up
npm run dev:api
npm run dev:web
```

## Quality Gates

Run the same sequence used by CI:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run test` includes a negative boundary fixture check that creates forbidden temporary imports
and verifies ESLint blocks them.

## Documentation

- [docs/backlog.md](docs/backlog.md) tracks reviewer-sized milestone tasks.
- [docs/workspace-boundaries.md](docs/workspace-boundaries.md) defines dependency rules.
- [docs/api.md](docs/api.md) defines routes, envelopes, validation, and error standards.
- [docs/events.md](docs/events.md) defines event envelopes, topics, partitioning, and outbox rules.
- [docs/data-model.md](docs/data-model.md) captures planned schema, migration rules, and invariants.
- [docs/code-review.md](docs/code-review.md) provides invariant and quality review checks.
- [docs/runbooks/local-development.md](docs/runbooks/local-development.md) describes local setup.
- [docs/runbooks/troubleshooting.md](docs/runbooks/troubleshooting.md) covers common local failures.
- [docs/adr](docs/adr) stores accepted architecture decisions.
