# SPEC.md

## Project

Real-Time Crypto Trading Platform

## Goal

Build a zero-cost, production-style crypto trading prototype that is strong enough for a backend or full-stack CV. The project must show real-time data handling, trading-domain correctness, database consistency, event-driven design, observability, and disciplined engineering practices.

This is not a real-money exchange. It is a paper-trading platform using live public crypto market data.

## Non-Goals

- No real money deposits, withdrawals, custody, or payment processing.
- No paid cloud services.
- No paid market-data provider.
- No production financial compliance claims.
- No client-side secrets.
- No fake "completed" features without tests or documentation.

## Target Users

- A demo user who wants to paper trade BTC/ETH with live market prices.
- A reviewer who wants to inspect architecture, code quality, tests, and observability.
- A developer who wants to run the whole project locally with one command.

## Core Features

### Authentication

- Register and login with email and password.
- Password hashing with Argon2 or bcrypt.
- JWT access token and refresh token flow.
- Server-side validation with Zod.
- Rate limit auth endpoints.
- Basic role model:
  - `USER`
  - `ADMIN`

### Market Data

- Connect to a free public crypto WebSocket feed.
- Initial providers:
  - Coinbase Advanced Trade WebSocket
  - Binance public market streams
- Supported symbols for prototype:
  - `BTC-USD` or `BTCUSDT`
  - `ETH-USD` or `ETHUSDT`
- Normalize provider-specific messages into internal market events.
- Store recent ticks and candles.
- Broadcast live prices to connected frontend clients.
- Reconnect automatically when provider connection drops.
- Expose provider health status.

### Trading

- Paper balances only.
- Seed every new user with demo USD balance.
- Place buy and sell orders.
- Supported order types:
  - limit order
  - market order
- Supported order states:
  - `PENDING`
  - `OPEN`
  - `PARTIALLY_FILLED`
  - `FILLED`
  - `CANCELLED`
  - `REJECTED`
- Matching engine uses price-time priority.
- Users cannot spend more cash or asset balance than available.
- Balances are reserved when orders are accepted.
- Trades settle through an append-only ledger.
- Every order mutation produces an audit event.

### Order Book

- Maintain in-memory order books per symbol.
- Bids sorted by highest price first, then earliest time.
- Asks sorted by lowest price first, then earliest time.
- Publish order book snapshots and incremental updates.
- Support order cancellation.
- Rebuild order book from persisted open orders during service startup.

### Ledger

- Use PostgreSQL as the system of record.
- Ledger must be append-only.
- Never update historical ledger entries.
- Store debits, credits, reserves, releases, fills, fees, and adjustments.
- Use database transactions for order placement and settlement.
- Provide user portfolio and balance views derived from ledger data.

### Real-Time WebSocket API

- Client can subscribe to:
  - market ticks
  - candles
  - order book updates
  - own order updates
  - own trade updates
  - portfolio updates
- Authenticate private WebSocket channels.
- Heartbeat/ping-pong connection health.
- Backpressure protection for slow clients.
- Server-side fanout through Redis Pub/Sub or Redis Streams.

### User Interface

- React frontend with TypeScript.
- Trading screen:
  - symbol selector
  - live price
  - candlestick chart
  - buy/sell form
  - order book
  - recent trades
  - open orders
  - portfolio summary
- Admin/dev screen:
  - feed status
  - service health
  - event throughput
  - order latency metrics
  - recent errors

### Admin and Audit

- Admin can view:
  - users
  - orders
  - trades
  - ledger events
  - market-data provider status
  - system metrics links
- Audit log records security and trading events.
- Audit events are immutable after creation.

## Data Model

### Main Entities

- `users`
- `sessions`
- `symbols`
- `orders`
- `trades`
- `ledger_entries`
- `market_ticks`
- `candles`
- `audit_events`
- `outbox_events`

### PostgreSQL Is Primary

PostgreSQL is used for all critical state:

- user accounts
- orders
- trades
- balances
- ledger
- audit log
- outbox events

MongoDB is not part of the initial prototype. It can be added later only if there is a real document-data use case, such as large flexible market snapshots or unstructured analytics payloads.

## API Scope

### REST API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/symbols`
- `GET /api/market/:symbol/ticks`
- `GET /api/market/:symbol/candles`
- `GET /api/orderbook/:symbol`
- `POST /api/orders`
- `GET /api/orders`
- `DELETE /api/orders/:orderId`
- `GET /api/trades`
- `GET /api/portfolio`
- `GET /api/admin/audit-events`
- `GET /api/admin/health`

### WebSocket Channels

- `market.ticks.{symbol}`
- `market.candles.{symbol}`
- `orderbook.{symbol}`
- `user.orders`
- `user.trades`
- `user.portfolio`
- `system.health`

## Event Model

### Internal Events

- `MarketTickReceived`
- `CandleUpdated`
- `OrderRequested`
- `OrderAccepted`
- `OrderRejected`
- `OrderCancelled`
- `OrderMatched`
- `TradeCreated`
- `LedgerEntryCreated`
- `PortfolioUpdated`
- `AuditEventCreated`

### Event Rules

- Events must have stable IDs.
- Consumers must be idempotent.
- Order and trade events must include correlation IDs.
- Events that represent durable business changes must be persisted.
- The outbox pattern should be used before publishing critical events.

## Quality Requirements

### Correctness

- No negative cash or asset balance.
- No filled order without corresponding trade records.
- No trade settlement without ledger entries.
- No ledger mutation after creation.
- Matching engine behavior must be covered by unit tests.
- Order placement and settlement must be covered by integration tests.

### Performance Targets For Prototype

Local laptop targets, not production promises:

- API p95 latency under 200 ms for normal REST reads.
- Order placement p95 under 300 ms under small local load.
- WebSocket market tick fanout under 250 ms from ingest to browser.
- Matching engine benchmark documented in `docs/benchmarks.md`.

### Reliability

- Market-data provider reconnects automatically.
- Service startup rebuilds in-memory books from durable state.
- Failed async events go to a dead-letter stream or table.
- All services expose health checks.

### Security

- Passwords never stored in plain text.
- JWT secrets server-only.
- Refresh tokens stored hashed.
- Request validation on every external input.
- Rate limiting on auth, order placement, and WebSocket connection attempts.
- CORS locked to local frontend origin in development.

### Accessibility

- Keyboard accessible forms and buttons.
- Proper labels for inputs.
- Visible focus states.
- Color is not the only signal for buy/sell states.

## Zero-Cost Constraint

Everything must run locally for free:

- Docker Desktop or compatible Docker engine
- PostgreSQL container
- Redis container
- Redpanda container
- Prometheus container
- Grafana container
- Jaeger or Tempo container
- Local frontend and backend dev servers

No paid deploy, paid storage, or paid market data is required.

## Milestones

### Milestone 1: Foundation

- Monorepo structure.
- TypeScript strict mode.
- Docker Compose for PostgreSQL, Redis, Redpanda, Prometheus, Grafana.
- Backend health endpoint.
- Frontend shell.
- CI with lint, typecheck, and tests.
- Husky and lint-staged.

### Milestone 2: Auth And Portfolio

- Register/login.
- Demo balance seeding.
- Portfolio endpoint.
- Basic protected frontend routes.

### Milestone 3: Market Data

- Coinbase or Binance WebSocket ingestion.
- Market event normalization.
- Tick storage.
- Frontend live price and chart.
- Reconnect handling.

### Milestone 4: Matching Engine

- Limit and market orders.
- Price-time priority.
- Order cancellation.
- Unit tests for matching edge cases.
- PostgreSQL transaction-backed order acceptance.

### Milestone 5: Real-Time Trading

- Private WebSocket order updates.
- Order book broadcast.
- Portfolio updates.
- Redis fanout.
- Audit log.

### Milestone 6: Observability And Benchmarking

- OpenTelemetry traces.
- Prometheus metrics.
- Grafana dashboards.
- Structured logs.
- k6 load tests.
- Benchmark documentation.

### Milestone 7: Portfolio Polish

- Architecture diagram.
- Screenshots.
- Demo data script.
- README runbook.
- Code review checklist.
- CV bullet examples.

## Definition Of Done

A feature is done only when:

- implementation exists
- types pass
- lint passes
- tests pass where relevant
- behavior matches this spec
- errors are visible and actionable
- observability is included for backend paths
- documentation is updated when behavior or architecture changes

