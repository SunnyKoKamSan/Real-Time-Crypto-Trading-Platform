# Delivery Backlog

## Completed Bootstrap

- [x] Create a local-first TypeScript monorepo for the trading platform.
- [x] Add API, web, and shared-domain workspace packages.
- [x] Add Docker Compose infrastructure for PostgreSQL, Redis, Redpanda, Prometheus, Grafana, and Jaeger.
- [x] Add CI, Husky hooks, linting, type-checking, tests, and build scripts.
- [x] Keep the first commit at prototype-bootstrap level instead of pretending the exchange is complete.

## Week 1 - Architecture Lock And Delivery Foundation

- [x] Add ADRs for PostgreSQL, Redis, Redpanda, outbox, paper trading, Drizzle, and process model.
- [x] Add docs skeleton for runbooks, API, events, data model, benchmarks, and code review.
- [x] Update README with current commands and current implementation status.
- [x] Define API response envelope and correlation ID behavior.
- [x] Add correlation IDs to API logs and `/api/*` responses.
- [x] Refresh the dashboard shell to show foundation status and disabled trading gates.
- [ ] Verify Docker Compose services start cleanly on the local machine. Attempted on 2026-05-25;
      blocked because Docker daemon was not running.

## Week 2 - Database Foundation

- [ ] Install and configure Drizzle for PostgreSQL.
- [ ] Add migration workflow and document commands.
- [ ] Create schema for users, sessions, symbols, orders, trades, ledger entries, market ticks, candles, audit events, and outbox events.
- [ ] Add repository transaction helper under `apps/api/src/infra/db`.
- [ ] Seed prototype symbols and demo balances.
- [ ] Add repository tests for core create/read paths.
- [ ] Document schema decisions in `docs/data-model.md`.

## Week 3 - Auth And Sessions

- [ ] Add auth module folder and request schemas.
- [ ] Implement register, login, refresh, and logout endpoints.
- [ ] Hash passwords with Argon2 or bcrypt.
- [ ] Store refresh tokens hashed.
- [ ] Add auth rate-limit strategy.
- [ ] Add protected `GET /api/me`.
- [ ] Add auth integration tests for success, validation, and failure paths.

## Week 4 - Market Data Ingestion

- [ ] Choose Coinbase or Binance as the first provider.
- [ ] Define `MarketDataProvider` interface.
- [ ] Normalize provider ticks into internal `MarketTickReceived` events.
- [ ] Add reconnect with backoff and provider health state.
- [ ] Persist recent ticks.
- [ ] Aggregate one-minute candles.
- [ ] Broadcast public market ticks over WebSocket.

## Week 5 - Realtime Gateway And Market UI

- [ ] Add WebSocket subscription validation.
- [ ] Add public channels for ticks, candles, order book, and system health.
- [ ] Add heartbeat and disconnect handling.
- [ ] Add frontend reconnect and stale-data states.
- [ ] Replace fixture chart with live market data.
- [ ] Add accessible chart fallback table.

## Week 6 - Matching Engine Core

- [ ] Define pure order book data structures.
- [ ] Implement price-time-priority matching.
- [ ] Add deterministic tests for crossing orders.
- [ ] Add partial-fill tests.
- [ ] Add market-order tests.
- [ ] Add cancellation behavior tests.
- [ ] Add benchmark harness for matching throughput.

## Week 7 - Orders, Reserves, Ledger Settlement

- [ ] Implement transactional order placement.
- [ ] Reserve cash or asset balances when orders are accepted.
- [ ] Persist trades and ledger entries atomically.
- [ ] Release unused reserves on cancellation.
- [ ] Reject insufficient-balance orders with actionable errors.
- [ ] Add portfolio read model from ledger entries.
- [ ] Enable the frontend order form only after invariant tests pass.

## Week 8 - Private Realtime Trading Flow

- [ ] Authenticate private WebSocket subscriptions.
- [ ] Publish user order updates.
- [ ] Publish user trade updates.
- [ ] Publish portfolio updates.
- [ ] Add Redis-backed fanout for private channels.
- [ ] Add frontend open orders, trades, and portfolio updates.

## Later Milestones

- [ ] Add event outbox worker, idempotent consumers, retries, and dead-letter handling.
- [ ] Add admin/dev console for feed health, event throughput, errors, and observability links.
- [ ] Add OpenTelemetry traces, Prometheus metrics, and Grafana dashboards.
- [ ] Add k6 load tests and document benchmark evidence.
- [ ] Add security, accessibility, and invariant hardening pass.
- [ ] Package final demo script, screenshots, runbooks, and CV/interview notes.
