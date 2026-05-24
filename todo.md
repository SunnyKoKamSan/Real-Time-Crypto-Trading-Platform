# Initial Project Bootstrap (2026-05-24)

### Plan

- [x] Create a local-first TypeScript monorepo for the trading platform.
- [x] Add API, web, and shared-domain workspace packages.
- [x] Add Docker Compose infrastructure for PostgreSQL, Redis, Redpanda, Prometheus, Grafana, and Jaeger.
- [x] Add CI, Husky hooks, linting, type-checking, tests, and build scripts.
- [x] Keep the first commit at prototype-bootstrap level instead of pretending the exchange is complete.

### Review

- Initial scaffold contains a React trading workspace shell, Express API health/symbol endpoints, WebSocket gateway skeleton, shared domain types, local observability/storage containers, and project documentation.
- Verification passed: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Git target: push the initial commit to the `dev` branch of `SunnyKoKamSan/Real-Time-Crypto-Trading-Platform`.

# Milestone 1 - Market Data Ingestion

### Plan

- [ ] Choose the first live market provider: Coinbase Advanced Trade WebSocket or Binance public streams.
- [ ] Implement provider adapters behind a `MarketDataProvider` interface.
- [ ] Normalize external ticks into internal `MarketTick` events.
- [ ] Add reconnect with exponential backoff and provider health state.
- [ ] Persist recent ticks and aggregate one-minute candles.
- [ ] Broadcast live market ticks to the frontend over WebSocket.

### Review

- Pending.

# Milestone 2 - Auth And Demo Portfolio

### Plan

- [ ] Add PostgreSQL migrations for users, sessions, balances, and audit events.
- [ ] Add email/password registration and login.
- [ ] Hash passwords with Argon2 or bcrypt.
- [ ] Add JWT access tokens and hashed refresh tokens.
- [ ] Seed every new user with demo USD and crypto paper balances.
- [ ] Add protected portfolio APIs and frontend portfolio panel.

### Review

- Pending.

# Milestone 3 - Matching Engine

### Plan

- [ ] Add order, trade, ledger, and outbox tables.
- [ ] Implement limit orders and market orders.
- [ ] Match orders with price-time priority.
- [ ] Reserve balances on order acceptance.
- [ ] Settle fills through append-only ledger entries.
- [ ] Rebuild in-memory order books from PostgreSQL on startup.
- [ ] Add unit tests for partial fills, cancellation, insufficient balance, and crossing orders.

### Review

- Pending.

# Milestone 4 - Event-Driven Trading Flow

### Plan

- [ ] Publish durable business events through an outbox table.
- [ ] Create Redpanda topics for orders, trades, ledger, market ticks, and dead-letter events.
- [ ] Add Redis-backed WebSocket fanout for public and private channels.
- [ ] Add idempotent consumers with retry and dead-letter handling.
- [ ] Add correlation IDs across REST, events, logs, and WebSocket messages.

### Review

- Pending.

# Milestone 5 - Observability And Benchmarks

### Plan

- [ ] Add OpenTelemetry instrumentation for API, market ingest, matching, and WebSocket broadcast.
- [ ] Add Prometheus metrics for latency, throughput, reconnects, and error counts.
- [ ] Build Grafana dashboards and save screenshots for the README.
- [ ] Add k6 tests for order placement and WebSocket fanout.
- [ ] Document benchmark results in `docs/benchmarks.md`.

### Review

- Pending.

# Milestone 6 - Portfolio Polish

### Plan

- [ ] Add architecture diagrams under `docs/`.
- [ ] Add API examples and local runbook.
- [ ] Add screenshots and a short demo video link.
- [ ] Add code review checklist in `docs/code-review.md`.
- [ ] Add CV bullet examples and interview explanation notes.
- [ ] Verify `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and major e2e/load checks.

### Review

- Pending.
