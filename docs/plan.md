# Enterprise Delivery Roadmap

Project: Real-Time Crypto Trading Platform
Planning window: May 25, 2026 through September 6, 2026
Target outcome: a local-first, zero-cost, production-style paper trading platform that demonstrates senior backend, distributed systems, full-stack, correctness, security, observability, and product engineering depth.

This roadmap upgrades the project from a demo scaffold into a reviewer-grade engineering artifact. It assumes the current repository shape:

- `apps/api` owns the Express API, WebSocket gateway, market-data ingestor modules, worker entrypoints, and infrastructure adapters.
- `apps/web` owns the React/Vite trading workspace, admin/dev console, and reviewer-facing UI flows.
- `packages/domain` owns shared contracts only: enums, DTOs, Zod schemas, event envelopes, response envelope types, and pure invariant helpers.
- `docker-compose.yml` runs PostgreSQL, Redis, Redpanda, Prometheus, Grafana, and Jaeger locally.
- Architecture and product decisions live in `README.md`, `SPEC.md`, `ARCHITECTURE.md`, `docs/api.md`, `docs/events.md`, `docs/data-model.md`, and `docs/adr/*`.

The project remains a paper-trading prototype. It must not support real-money deposits, withdrawals, custody, external exchange order routing, payment processing, regulated compliance claims, or production financial certification.

## North Star

By the end of Milestone 15, a reviewer should be able to run, inspect, test, and trust the system locally:

- A developer can bootstrap the complete local stack with documented commands.
- A user can register, login, view live BTC/ETH market data, place paper trades, cancel orders, and see portfolio updates in real time.
- PostgreSQL is the source of truth for users, balances, reserves, orders, trades, ledger entries, audit events, and outbox events.
- Redis and in-memory books are derived state and can be deleted or rebuilt without losing critical business state.
- Critical trading invariants hold under normal, concurrent, retry, restart, and failure scenarios.
- The matching engine is deterministic, pure, and covered by unit, adversarial, property-style, and benchmark tests.
- Durable state changes emit durable events through the transactional outbox before asynchronous fanout.
- Logs, metrics, traces, admin screens, runbooks, and benchmark docs make the system operable and reviewable.
- The frontend is usable under loading, empty, error, reconnecting, mobile, keyboard, and high-frequency update states.

## Enterprise Quality Bar

Treat every feature as incomplete until it has implementation, validation, tests, documentation, and operational visibility.

### Engineering Bar

- Strict TypeScript across API, web, and shared packages.
- `packages/domain` has no imports from API, DB, Redis, Redpanda, React, Node process configuration, or runtime infrastructure.
- `apps/api` and `apps/web` consume shared contracts through `@rtctp/domain`, not by deep-importing each other's internals.
- Module boundaries are enforced by TypeScript project references, workspace scripts, and ESLint `no-restricted-imports`.
- Domain logic stays out of HTTP controllers and React presentation components.
- All external REST and WebSocket payloads are validated with Zod or equivalent schemas.
- Financial values use exact decimal handling: PostgreSQL `NUMERIC(20, 8)`, decimal strings at repository/API/event boundaries, and no JavaScript `number` arithmetic for money, price, quantity, balance, reserve, or fee.
- Database writes for order acceptance, reserve movement, settlement, audit, and outbox emission happen inside explicit transactions.
- Business events carry stable IDs, versions, aggregate identifiers, timestamps, correlation IDs, causation IDs where relevant, and partition keys.
- Redis is limited to cache, rate limits, pub/sub or streams, and derived snapshots.
- Logs never contain passwords, refresh tokens, JWTs, hashes, secrets, or raw credentials.

### Product Bar

- Trading screen supports repeated use: live price, chart, order form, order book, recent trades, open orders, order history, and portfolio summary are visible without hunting.
- Admin/dev screen exposes provider health, service health, WebSocket health, outbox lag, event throughput, dead-letter diagnostics, and observability links.
- Errors are actionable: validation failures identify fields, auth failures are safe, order rejections explain the trading reason, and internal errors include correlation IDs.
- UI is keyboard accessible, responsive, and stable under loading, empty, error, reconnect, stale-data, and high-update-frequency states.

### Reliability Bar

- Market data reconnects with exponential backoff and jitter, reports health, and supports fixture replay when public providers are unavailable.
- WebSocket connections have heartbeat, subscription validation, authenticated private channels, per-client queue limits, and slow-client teardown.
- In-memory order books rebuild from durable open orders during startup.
- Async event failures retry, preserve durable state, and eventually move to a dead-letter topic or table with visible diagnostics.
- Load tests and benchmarks document local prototype limits honestly.

### Review Bar

Every milestone must produce evidence:

- Passing command output or documented blockers.
- Tests for newly introduced invariants.
- Docs updates for changed contracts, data models, commands, or architecture.
- Screenshots or manual verification notes where frontend or observability changes matter.
- Benchmark numbers where performance claims are introduced.
- Known limitations instead of hidden hand-waving.

## Milestone Operating Cadence

Use a lightweight but disciplined cadence.

- Monday: lock milestone scope, choose must-ship items, define acceptance criteria, update issues/tasks.
- Tuesday to Thursday: implement the core vertical slice with reviewable commits and tests close to the code.
- Friday: integrate, harden, run quality gates, update docs, and record evidence.
- Buffer period: fix defects, reduce debt, refine UI, and prepare the next milestone.

For each milestone:

- Keep one primary milestone and at most two supporting goals.
- Prefer end-to-end vertical slices over isolated partial systems.
- Do not mark behavior complete without tests and docs.
- Track deferred items explicitly.
- Protect the paper-trading-only scope.

## Global Definition Of Done

Before any milestone is considered done:

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes unless a temporary blocker is documented with an owner.
- New external inputs have validation.
- New critical paths have unit or integration tests.
- New backend behavior has structured logs and correlation IDs where relevant.
- New user-facing or operator-facing behavior has loading, empty, error, and permission states.
- Documentation is updated when behavior, commands, data models, event contracts, or architecture change.

For trading-specific milestones:

- No negative cash or asset balance is possible through public APIs.
- No accepted order can exist without reserve handling.
- No trade can exist without corresponding ledger entries.
- Cancellation releases exactly unused reserves.
- Filled orders are not left open.
- Matching is deterministic across repeated runs.
- PostgreSQL state can rebuild derived order-book state.

## Timeline Summary

| Milestone | Dates               | Primary Theme                                      | Outcome                                                                    |
| --------- | ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| 1         | May 25-May 31, 2026 | Architecture lock and delivery foundation          | Enforced boundaries, docs baseline, API/event standards, CI gates          |
| 2         | Jun 1-Jun 7, 2026   | Database foundation and domain model               | Drizzle schema, migrations, repositories, precision rules, seed data       |
| 3         | Jun 8-Jun 14, 2026  | Auth, sessions, and security baseline              | Register/login/refresh/logout, token rotation, rate limits, secure seeding |
| 4         | Jun 15-Jun 21, 2026 | Market data ingestion                              | Provider adapter, bounded ingest, ticks, candles, health, fixture replay   |
| 5         | Jun 22-Jun 28, 2026 | Realtime gateway and market UI                     | Public WebSocket channels, live dashboard, slow-client protection          |
| 6         | Jun 29-Jul 5, 2026  | Matching engine core                               | Pure deterministic price-time engine with invariant and benchmark tests    |
| 7         | Jul 6-Jul 12, 2026  | Orders, reserves, ledger settlement                | ACID order placement, reserve locks, fills, cancellations, portfolio views |
| 8         | Jul 13-Jul 19, 2026 | Realtime private trading flow                      | Private user events, Redis fanout, UI reconciliation, cross-tenant safety  |
| 9         | Jul 20-Jul 26, 2026 | Event streaming and workers                        | Outbox worker, Redpanda topics, idempotent consumers, dead-letter handling |
| 10        | Jul 27-Aug 2, 2026  | Admin, audit, and product depth                    | Admin/dev console, immutable audit trail, cursor pagination, history views |
| 11        | Aug 3-Aug 9, 2026   | Observability                                      | OTel traces, Prometheus metrics, Grafana dashboards, correlation workflows |
| 12        | Aug 10-Aug 16, 2026 | Performance and reliability                        | k6 tests, benchmarks, graceful shutdown, failure drills, recovery evidence |
| 13        | Aug 17-Aug 23, 2026 | Security, accessibility, and correctness hardening | Threat model, fuzzing, permission tests, a11y pass, invariant expansion    |
| 14        | Aug 24-Aug 30, 2026 | Developer experience and portfolio packaging       | One-command setup, reviewer guide, screenshots, demo data, runbooks        |
| 15        | Aug 31-Sep 6, 2026  | Final stabilization and launch package             | Release candidate, final QA, benchmarks, demo script, CV/interview assets  |

## Milestone 1: Architecture Lock And Delivery Foundation

Dates: May 25-May 31, 2026

### Primary Goal

Convert the scaffold into an execution-ready engineering foundation with enforced package boundaries, stable architecture decisions, API/event standards, workspace quality gates, and reviewer-readable docs.

### Why This Milestone Matters

The system combines trading, realtime data, persistence, event streaming, observability, and UI. Without early boundary enforcement, later milestones will accumulate hidden coupling that makes correctness and review harder.

### Deliverables

- Confirm final 15-milestone scope and paper-trading-only boundary.
- Keep accepted ADRs under `docs/adr` aligned with the implementation plan:
  - PostgreSQL as source of truth.
  - Redis for derived and short-lived state.
  - Redpanda for local Kafka-compatible event streaming.
  - Transactional outbox for durable business events.
  - Drizzle for PostgreSQL access.
  - Exact decimal financial values.
  - Single-process modular entrypoints initially.
- Create or update docs skeleton:
  - `docs/runbooks/local-development.md`
  - `docs/runbooks/troubleshooting.md`
  - `docs/api.md`
  - `docs/events.md`
  - `docs/data-model.md`
  - `docs/benchmarks.md`
  - `docs/code-review.md`
- Define package/module ownership and import boundaries.
- Define global API response envelope and event envelope standards.
- Validate root scripts and workspace commands.

### Engineering Tasks

- Enforce workspace boundaries:
  - `packages/domain` must not import from `apps/api`, `apps/web`, infrastructure, DB clients, Redis, Redpanda, process env, or React.
  - `apps/web` must not deep-import API implementation files.
  - `apps/api` must not deep-import React/web implementation files.
  - Shared DTOs, enums, response envelopes, event names, Zod schemas, and invariant helpers belong in `@rtctp/domain`.
- Configure TypeScript project references or build ordering so `@rtctp/domain` builds before API/web.
- Add ESLint `no-restricted-imports` rules for forbidden cross-package and deep internal imports.
- Add a circular dependency check if practical, or document the selected tool and command for Milestone 2 if setup is deferred.
- Define API response envelope in `docs/api.md`:
  - `ok`.
  - `data` or `error`.
  - `meta.correlationId`.
  - `meta.timestamp` as an ISO wall-clock string for user-facing semantics.
  - `meta.hrtimeNs` as a high-resolution monotonic nanosecond string generated from `process.hrtime.bigint()` for local telemetry ordering.
- Define module layout:
  - `modules/auth`
  - `modules/users`
  - `modules/market-data`
  - `modules/orders`
  - `modules/matching`
  - `modules/ledger`
  - `modules/portfolio`
  - `modules/audit`
  - `modules/websocket`
  - `modules/outbox`
  - `infra/db`
  - `infra/redis`
  - `infra/redpanda`
  - `infra/telemetry`
- Define test split:
  - pure unit tests near domain and matching modules.
  - API integration tests under `apps/api/test`.
  - frontend tests near features/components.
  - future browser/e2e tests under `apps/web/e2e` or top-level `e2e`.

### Documentation Tasks

- Update `README.md` with current setup reality and clearly label future capabilities.
- Update `ARCHITECTURE.md` with actual workspace and module ownership rules.
- Update `docs/api.md` with response envelopes, error codes, pagination standards, correlation ID rules, and financial string policy.
- Update `docs/events.md` with event envelope, topic list, partition key policy, idempotency requirements, and secret-exclusion rules.
- Add code review checklist items for:
  - import boundaries.
  - transaction boundaries.
  - decimal precision.
  - auth and private data.
  - event durability.
  - observability.

### Tests And Verification

- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Add or validate a test/import-boundary failure case proving forbidden imports are blocked.
- Confirm Docker Compose services start, or document blockers in the local runbook.
- Confirm CI, if present, matches local quality commands.
- Confirm ignored build artifacts do not pollute Git status.

### Exit Criteria

- Architecture decisions are documented enough that later milestones do not repeatedly reopen them.
- Import boundaries are enforceable, not just described.
- API/event envelope rules are explicit and shared by code and docs.
- Workspace commands pass or failures are documented with owners.
- The roadmap can be followed without inventing missing system boundaries.

### Risk Watch

- Risk: over-designing before implementation. Mitigation: ADRs stay short and decision-focused.
- Risk: boundary rules blocking legitimate shared code. Mitigation: move true shared contracts into `packages/domain`.
- Risk: docs drift immediately. Mitigation: every later milestone includes docs updates in its definition of done.

## Milestone 2: Database Foundation And Domain Model

Dates: June 1-June 7, 2026

### Primary Goal

Build the durable state foundation: Drizzle schema, migrations, transaction helpers, repositories, seed data, constraints, indexes, and domain primitives for users, sessions, symbols, balances, orders, trades, ledger entries, audit events, market data, candles, and outbox events.

### Why This Milestone Matters

The platform's credibility depends on durable correctness. Trading systems are judged by state transitions, constraints, auditability, and recovery behavior, not just happy-path endpoints.

### Deliverables

- Drizzle configured for PostgreSQL.
- Migration system wired into local development.
- Schema for:
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
  - `processed_events`
- Seed script for BTC/ETH symbols, admin/dev user, demo users, and initial paper balances.
- Transaction helper that passes scoped transaction clients into repositories.
- Initial repositories for user, session, symbol, ledger, audit, market data, and outbox access.
- Database health check.

### Engineering Tasks

- Enforce exact financial precision:
  - Use PostgreSQL `NUMERIC(20, 8)` for prices, quantities, balances, reserves, releases, settlement amounts, and fees.
  - Drizzle repository boundaries expose financial values as strings.
  - API and event payloads serialize financial values as strings.
  - Application/domain arithmetic uses `decimal.js` or equivalent exact decimal type.
  - JavaScript `number` is forbidden for financial arithmetic.
- Add representative constraints:
  - unique user email.
  - unique symbol code.
  - valid order side, type, and status.
  - positive accepted order quantities.
  - non-negative filled and remaining quantities.
  - filled quantity cannot exceed total quantity.
  - limit orders require positive price.
  - market orders do not persist a submitted limit price.
  - positive trade quantity and price.
  - ledger entry amounts are signed or typed consistently, but never ambiguous.
  - outbox status enum.
- Add matching-rebuild indexes:
  - open buy orders by `(symbol, price DESC, created_at ASC, id ASC)` with partial status filter.
  - open sell orders by `(symbol, price ASC, created_at ASC, id ASC)` with partial status filter.
- Add high-volume indexes:
  - orders by user/status/created time.
  - trades by symbol/created time.
  - ledger entries by user/asset/created time.
  - outbox events by status/created time.
  - market ticks by symbol/timestamp.
  - candles by symbol/interval/timestamp.
  - processed events by `(consumer_group_name, event_id)`.
- Implement repository pattern:
  - Repository methods accept a scoped DB or transaction client.
  - Pure business routines never receive the global raw database client.
  - Known database errors translate into typed application errors.
- Seed initial balances through ledger entries only, using a systemic source such as `SYSTEM_MINT`.

### Domain Tasks

- Add domain enums:
  - `OrderSide`
  - `OrderType`
  - `OrderStatus`
  - `LedgerEntryType`
  - `Asset`
  - `AuditEventType`
  - `OutboxEventStatus`
- Add invariant helpers:
  - `isTerminalOrderStatus`
  - `canCancelOrder`
  - `requiresLimitPrice`
  - `validateOrderQuantity`
  - `validateDecimalString`
  - `assertFinancialString`
- Define event metadata:
  - event ID.
  - event type.
  - payload version.
  - aggregate type.
  - aggregate ID.
  - partition key.
  - occurred-at timestamp.
  - correlation ID.
  - causation ID where relevant.

### Documentation Tasks

- Fill `docs/data-model.md` with tables, relationships, constraints, indexes, ownership, and source-of-truth boundaries.
- Keep `docs/adr/0008-financial-precision.md` aligned with the actual schema.
- Add migration and seed commands to `docs/runbooks/local-development.md`.
- Add examples showing how ledger entries reconstruct balances.

### Tests And Verification

- Integration tests:
  - migrate empty database to latest schema.
  - seed script is idempotent.
  - transaction helper rolls back all writes on failure.
  - database rejects invalid order quantities and statuses.
  - database rejects filled quantities greater than order quantity.
  - ledger repository does not expose mutation of historical rows.
  - outbox rows can be inserted inside a caller transaction.
- Unit tests:
  - decimal parsing and formatting.
  - domain enum validation.
  - invariant helpers.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - migration command
  - seed command

### Exit Criteria

- A fresh local database can be migrated and seeded predictably.
- Financial precision rules are enforced in code, schema, docs, and tests.
- Core indexes support book rebuild and high-volume query paths.
- Repository access is transaction-aware.
- Later auth and trading milestones can build without reworking the durable model.

### Risk Watch

- Risk: decimal handling bugs. Mitigation: reject `number` at boundaries and test decimal utilities early.
- Risk: schema churn. Mitigation: allow migrations to evolve while preserving financial and order invariants.
- Risk: slow integration tests. Mitigation: keep DB fixtures focused and provide reliable setup helpers.

## Milestone 3: Auth, Sessions, And Security Baseline

Dates: June 8-June 14, 2026

### Primary Goal

Implement secure registration, login, refresh, logout, protected routes, role support, demo-balance seeding, and baseline API security controls.

### Why This Milestone Matters

Private trading depends on reliable identity. Weak token handling, noisy auth errors, unsafe logs, or unbounded login attempts would undermine the entire project.

### Deliverables

- REST endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/me`
- Password hashing with Argon2 or bcrypt.
- Short-lived JWT access token.
- Hashed refresh token persistence.
- Refresh token rotation and replay detection.
- Auth middleware for protected routes.
- Role model: `USER` and `ADMIN`.
- Redis-backed rate limiting for auth endpoints.
- Demo balance seeding through ledger entries.
- Basic frontend auth flow and protected app shell.

### Engineering Tasks

- Add Zod schemas for every auth request and response.
- Implement refresh token rotation:
  - Store only hashed refresh tokens.
  - Persist unique session IDs and token family identifiers.
  - Revoke the old token when issuing a new refresh token.
  - Detect reuse of an expired, revoked, or rotated token.
  - Record an auth anomaly in `audit_events`.
  - Revoke the affected session family on suspicious reuse.
- Add Redis-backed rate limiting:
  - Use sliding-window or token-bucket logic with atomic Redis operations.
  - Isolate pools for `POST /api/auth/login`, registration, refresh, and general API access.
  - Return standard `429 RATE_LIMITED` envelope and rate-limit headers.
- Normalize auth errors:
  - Invalid credentials do not reveal whether email exists.
  - Expired, malformed, and revoked token reasons are distinguishable internally but safe publicly.
  - Public errors are concise and include correlation IDs.
- Implement password policy:
  - minimum length.
  - maximum length to prevent abuse.
  - safe validation messages.
- Add audit events:
  - user registered.
  - login success.
  - login failure.
  - token refreshed.
  - refresh replay detected.
  - logout.
  - session revoked.
- Seed new-user demo balances only through ledger entries with a `SYSTEM_MINT` or equivalent source type.
- Ensure plaintext passwords and tokens are never logged or included in error objects.

### Frontend Tasks

- Add login and register screens.
- Add authenticated API client.
- Add token refresh handling.
- Add protected dashboard shell.
- Add safe logout behavior.
- Render auth validation, loading, and generic credential failure states.

### Documentation Tasks

- Update `docs/api.md` with auth endpoints, response examples, error codes, and rate-limit headers.
- Update `docs/data-model.md` with user/session tables and refresh token lifecycle.
- Add security notes to the local runbook:
  - JWT secret setup.
  - refresh token behavior.
  - local-only assumptions.
  - demo account credentials.

### Tests And Verification

- Unit tests:
  - password hashing wrapper.
  - token creation and verification.
  - refresh token hashing.
  - auth validation schemas.
  - rate-limit decision logic.
- Integration tests:
  - register happy path.
  - duplicate email.
  - login success.
  - login wrong password.
  - refresh success rotates token.
  - old refresh token reuse triggers anomaly and revocation.
  - logout revokes active refresh token.
  - protected endpoint without token returns `401`.
  - protected endpoint with valid token succeeds.
  - auth rate limit returns `429`.
  - new user balances are ledger-derived.
- Frontend tests:
  - auth form validation.
  - protected state rendering.
  - logout state reset.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

### Exit Criteria

- A demo user can register, login, refresh, logout, and call protected APIs.
- Refresh tokens rotate and replay attempts are visible in audit logs.
- New user balances are seeded through ledger entries only.
- Auth errors are safe, rate-limited, and documented.
- Admin role exists for later admin/dev screens.

### Risk Watch

- Risk: unsafe token storage. Mitigation: persist only refresh token hashes.
- Risk: auth state spreads through unrelated UI. Mitigation: isolate API client and auth store.
- Risk: overbuilt frontend token policy. Mitigation: keep local prototype assumptions documented.

## Milestone 4: Market Data Ingestion

Dates: June 15-June 21, 2026

### Primary Goal

Connect to a free public crypto WebSocket provider, normalize market data, bound ingestion memory, store recent ticks/candles, expose provider health, and support fixture replay for deterministic tests.

### Why This Milestone Matters

Live data is a high-signal portfolio feature only if ingestion is reliable, measurable, bounded, and recoverable when upstream providers fail.

### Deliverables

- Market data provider interface.
- First provider adapter: Coinbase Advanced Trade WebSocket or Binance public streams.
- Normalized internal `MarketTickReceived` event.
- BTC and ETH pair support.
- Deterministic reconnect state machine with exponential backoff and jitter.
- Provider health state:
  - connected/disconnected.
  - last message timestamp.
  - reconnect count.
  - last error summary.
  - backlog/drop counters.
- Tick persistence and latest-price cache.
- One-minute candle aggregation.
- Fixture replay mode for parser, aggregator, and load tests.
- REST endpoints:
  - `GET /api/symbols`
  - `GET /api/market/:symbol/ticks`
  - `GET /api/market/:symbol/candles`

### Engineering Tasks

- Implement provider abstraction:
  - connect.
  - disconnect.
  - subscribe symbols.
  - parse raw message.
  - emit normalized ticks.
  - expose health.
- Normalize tick fields:
  - symbol.
  - price string.
  - size string.
  - provider timestamp.
  - received timestamp.
  - provider name.
  - provider sequence or trade ID where available.
- Protect the Node.js event loop:
  - Keep per-message parsing and normalization lightweight.
  - Target under 2ms local processing time per inbound tick under fixture playback.
  - Avoid synchronous heavy aggregation inside the raw socket callback.
- Add memory-bounded ingestion buffering:
  - circular buffer or bounded queue.
  - explicit overflow policy.
  - drop counters and warning logs.
  - no unbounded arrays of raw provider messages.
- Implement candle aggregation:
  - open.
  - high.
  - low.
  - close.
  - volume.
  - interval start.
  - interval end.
  - late/duplicate tick policy.
- Add Redis cache for latest price by symbol.
- Ensure API can start without provider if configured, with visible degraded health.

### Documentation Tasks

- Update `docs/events.md` with market events and partition keys.
- Update `docs/api.md` with market endpoints and pagination.
- Add provider choice note or ADR if needed.
- Update `docs/runbooks/troubleshooting.md` with:
  - provider unavailable.
  - symbol subscription fails.
  - rate-limited or disconnected feed.
  - fixture replay mode.

### Tests And Verification

- Unit tests:
  - provider message parser.
  - symbol normalization.
  - decimal string preservation.
  - candle aggregation.
  - reconnect state machine.
  - bounded queue overflow behavior.
- Integration tests:
  - market REST endpoints return stored data.
  - health endpoint reflects provider state.
  - fixture replay produces deterministic candles.
- Stress fixture test:
  - rapid tick bursts do not OOM.
  - candle windows remain accurate.
  - drop/backpressure counters match policy.
- Manual verification:
  - run API.
  - connect to provider.
  - observe structured tick/health logs.
  - query market endpoints.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

### Exit Criteria

- Backend receives live BTC/ETH market data or fixture replay data deterministically.
- Provider failures are visible and recoverable.
- Recent ticks and one-minute candles are stored or retrievable.
- Ingestion memory is bounded.
- Parser, reconnection, and aggregation behavior are covered by tests.

### Risk Watch

- Risk: provider message shape changes. Mitigation: keep fixtures and parser tests updated.
- Risk: provider downtime blocks development. Mitigation: fixture replay remains first-class.
- Risk: data volume overwhelms local database. Mitigation: use retention limits and document prototype bounds.

## Milestone 5: Realtime Gateway And Market UI

Dates: June 22-June 28, 2026

### Primary Goal

Deliver the first full realtime vertical slice: backend market feed to WebSocket gateway to browser trading dashboard, with subscription validation, backpressure, reconnect handling, and frontend render throttling.

### Why This Milestone Matters

This is where the project starts feeling alive. A reviewer should immediately see live prices, charts, feed status, and stable realtime behavior.

### Deliverables

- Public WebSocket channels:
  - `market.ticks.{symbol}`
  - `market.candles.{symbol}`
  - `system.health`
- WebSocket message envelope:
  - type.
  - channel.
  - payload.
  - event ID where applicable.
  - sequence ID where applicable.
  - timestamp.
  - correlation ID where relevant.
- Heartbeat and ping/pong handling.
- O(1)-style subscription lookup maps.
- Per-client queue limits and slow-client teardown.
- Frontend trading dashboard:
  - symbol selector.
  - live last price.
  - absolute and percentage movement.
  - candlestick or line chart.
  - feed connection status.
  - recent tick list or ticker tape.
  - stale-data indicator.
- Loading, empty, reconnecting, stale, and error states.

### Engineering Tasks

- Build WebSocket subscription manager:
  - connection ID.
  - subscribe.
  - unsubscribe.
  - validate channel names.
  - track connection health.
  - track outbound queue size.
  - cap subscriptions per connection.
- Use memory-bounded maps:
  - connection to subscriptions.
  - channel to connections.
  - user-private maps reserved for Milestone 8.
- Broadcast market ticks and candles from ingestion path to gateway.
- Add backpressure guard:
  - max queued messages or bytes per client.
  - disconnect slow clients exceeding watermark.
  - structured warning logs with no private payload leakage.
- Implement frontend WebSocket client:
  - reconnect with backoff and jitter.
  - resubscribe after reconnect.
  - parse typed envelopes.
  - expose status to UI.
  - refetch snapshot after reconnect.
- Batch frontend streaming updates:
  - use animation-frame or microtask buffering.
  - avoid layout thrashing under volatile market feeds.
  - keep chart data windows bounded.
- Build responsive dashboard layout with accessible color treatment for buy/sell/up/down states.

### Documentation Tasks

- Update `docs/events.md` with WebSocket envelope examples.
- Update `docs/api.md` with WebSocket channel list, subscription messages, and error frames.
- Add local manual test steps:
  - start Docker.
  - start API.
  - start web.
  - open dashboard.
  - verify ticks and reconnect behavior.

### Tests And Verification

- Backend tests:
  - subscription validation.
  - invalid channel rejection.
  - heartbeat behavior.
  - slow-client queue teardown policy.
  - message envelope shape.
- Frontend tests:
  - market status rendering.
  - symbol selector changes subscription.
  - reconnect state display.
  - stale-data warning.
  - batched updates do not grow unbounded state.
- Browser/manual verification:
  - live chart updates.
  - API stop shows reconnect state.
  - API restart triggers refetch and recovery.
  - desktop and mobile widths do not overlap controls.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

### Exit Criteria

- A user can view live BTC/ETH market prices in the browser.
- WebSocket behavior is documented and tested.
- Slow clients cannot exhaust backend memory.
- Reconnect/refetch behavior is visible and stable.
- The market UI is ready to accept private trading panels later.

### Risk Watch

- Risk: UI becomes chart-only and misses trading workflow. Mitigation: leave room for order form, order book, open orders, and portfolio panels.
- Risk: WebSocket contracts drift. Mitigation: define envelope types in `@rtctp/domain`.
- Risk: realtime tests become flaky. Mitigation: use fake sockets and deterministic timers where possible.

## Milestone 6: Matching Engine Core

Dates: June 29-July 5, 2026

### Primary Goal

Build a deterministic, pure, high-confidence matching engine that supports limit orders, market orders, price-time priority, partial fills, cancellation, and order book snapshots.

### Why This Milestone Matters

The matching engine is the strongest backend signal in the project. Reviewers will inspect whether the logic is isolated, deterministic, precise, and tested against adversarial cases.

### Deliverables

- Pure matching engine module with no HTTP, DB, Redis, WebSocket, logger, random ID, or wall-clock dependencies.
- In-memory order book per symbol.
- Price-time priority:
  - bids: highest price first, earliest time first.
  - asks: lowest price first, earliest time first.
- Explicit data structures with `O(log N)` insert/search behavior where practical, such as balanced tree, heap plus price-level queues, or well-documented sorted price-level map.
- Supported order types:
  - limit.
  - market.
- Supported statuses:
  - pending.
  - open.
  - partially filled.
  - filled.
  - cancelled.
  - rejected.
- Match result model:
  - accepted order update.
  - generated trades.
  - updated resting orders.
  - reserve release hints.
  - rejected reason.
  - snapshot deltas if useful.
- Deep unit and invariant test suite.

### Engineering Tasks

- Define engine input:
  - order ID.
  - user ID.
  - symbol.
  - side.
  - type.
  - price for limit orders.
  - quantity.
  - submitted timestamp.
  - explicit sequence number if needed.
- Define engine output:
  - order updates.
  - trade executions.
  - remaining book changes.
  - rejected reason.
  - deterministic snapshot.
- Use exact decimal comparison utilities from domain/application layer.
- Do not generate IDs, timestamps, random values, logs, DB writes, or events inside pure matching logic.
- Implement cancellation:
  - only open or partially filled resting orders can be cancelled.
  - target order is removed from book.
  - remaining quantity is returned for reserve release.
- Implement book rebuild input:
  - persisted open orders sorted by symbol, side, price, created time, and ID.
- Add matching benchmark scaffold for insert, cancel, market sweep, and snapshot operations.

### Edge Cases To Test

- Buy limit crosses existing ask.
- Sell limit crosses existing bid.
- Buy limit rests below best ask.
- Sell limit rests above best bid.
- Market buy fills best asks until quantity completes or liquidity ends.
- Market sell fills best bids until quantity completes or liquidity ends.
- Partial fill leaves remainder open for limit order.
- Partial fill cancels or rejects remainder for market order by explicit policy.
- Equal price orders match earliest created order first.
- Multiple fills across several price levels.
- Cancellation removes only the target order.
- Cancellation of filled order is rejected.
- Cancellation of unknown order is rejected.
- Self-trade policy is explicit and tested.
- Zero, negative, malformed, and over-precision quantities are rejected before matching.
- Fractional lot rounding does not create or destroy quantity.

### Invariant Tests

- Sum of filled quantities plus resting book quantities never exceeds submitted accepted quantities.
- Resting book never contains filled, cancelled, or rejected orders.
- Bid side is sorted by price descending then time ascending.
- Ask side is sorted by price ascending then time ascending.
- Trade price is derived from the resting order policy and is deterministic.
- Rebuilding from the same open-order set produces identical snapshots.

### Documentation Tasks

- Add `docs/matching-engine.md` with:
  - responsibilities.
  - inputs and outputs.
  - matching rules.
  - order status transitions.
  - self-trade policy.
  - decimal precision policy.
  - rebuild behavior.
  - benchmark commands.
- Update `docs/code-review.md` with matching-specific checks.

### Tests And Verification

- Unit tests cover all edge cases above.
- Property-style tests cover conservation and sorting invariants.
- Benchmark script records local baseline metrics.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - matching benchmark script if added

### Exit Criteria

- Matching behavior is deterministic and documented.
- Unit and invariant tests cover normal and adversarial cases.
- Engine can rebuild from persisted open orders.
- Engine has no infrastructure dependencies.
- The module is ready to be wrapped by transactional order placement in Milestone 7.

### Risk Watch

- Risk: persistence leaks into core matching. Mitigation: keep a pure engine and a separate orchestration service.
- Risk: decimal mismatch between engine and database. Mitigation: reuse shared decimal utilities and test string boundaries.
- Risk: self-trade ambiguity. Mitigation: decide and document policy explicitly.

## Milestone 7: Orders, Reserves, And Ledger Settlement

Dates: July 6-July 12, 2026

### Primary Goal

Connect the matching engine to the API and database with ACID order placement, balance reservation, row-level concurrency control, trade settlement, cancellation, portfolio projection, and outbox writes.

### Why This Milestone Matters

This is the core trading system. The project becomes credible only when order acceptance, matching, settlement, audit, and event creation are tied together safely in database transactions.

### Deliverables

- REST endpoints:
  - `POST /api/orders`
  - `GET /api/orders`
  - `DELETE /api/orders/:orderId`
  - `GET /api/trades`
  - `GET /api/portfolio`
  - `GET /api/orderbook/:symbol`
- Transactional order placement service.
- Balance and reserve calculation.
- Row-level lock strategy for account/balance rows or equivalent ledger-derived protection.
- Trade settlement through append-only ledger entries.
- Cancellation with exact reserve release.
- Portfolio projection from ledger entries.
- Startup rebuild of in-memory order books from persisted open orders.
- Outbox events written inside the same transaction as business state.

### Engineering Tasks

- Validate order requests:
  - supported symbol.
  - valid side.
  - valid type.
  - limit price required for limit orders.
  - market orders must not include price, or policy must reject it clearly.
  - positive decimal quantity.
  - optional `clientOrderId` unique per user for idempotent retries.
- Implement available balance calculation:
  - available cash.
  - available asset.
  - reserved cash.
  - reserved asset.
  - ledger-derived totals.
- Prevent double-spending:
  - Lock relevant user/asset balance rows or reservation records with `SELECT ... FOR UPDATE` or Drizzle equivalent.
  - Keep balance check, reserve write, matching, settlement, audit, and outbox write in one transaction.
  - Ensure concurrent buy submissions cannot reserve the same funds twice.
- Reserve on accepted order:
  - buy limit reserves quote asset based on price times quantity.
  - buy market reserve policy is explicit and bounded.
  - sell orders reserve base asset quantity.
  - reject insufficient balance before matching.
- Settlement must create complete ledger entries:
  - buyer quote reserve debit/release.
  - buyer base credit.
  - seller base reserve debit/release.
  - seller quote credit.
  - explicit zero-fee or fee entries if fees are modeled.
  - all financial values as strings.
- Persist:
  - accepted order.
  - trades.
  - order status updates.
  - ledger entries.
  - audit events.
  - outbox events.
- Implement cancellation:
  - authenticate ownership or admin role.
  - cancel only cancellable statuses.
  - remove from in-memory book.
  - persist status update.
  - release unused reserves through ledger entries.
  - write audit and outbox events.
- Implement portfolio endpoint:
  - balances by asset.
  - reserved amounts.
  - available amounts.
  - estimated USD value using latest market prices where available.
- Implement order book endpoint:
  - bids.
  - asks.
  - aggregated price levels.
  - last update timestamp.
  - sequence ID if available.

### Documentation Tasks

- Update `docs/api.md` with orders, trades, portfolio, and order book endpoints.
- Update `docs/data-model.md` with ledger examples and transaction boundaries.
- Add `docs/trading-invariants.md`:
  - no negative balances.
  - reservation rules.
  - settlement rules.
  - cancellation rules.
  - order state transitions.
  - crash/rollback behavior.

### Tests And Verification

- Integration tests:
  - place buy limit order with sufficient USD.
  - reject buy order with insufficient USD.
  - place sell order with sufficient asset.
  - reject sell order with insufficient asset.
  - concurrent buy orders cannot overspend.
  - match two users and create trade records.
  - create buyer and seller ledger entries.
  - partial fill leaves open remainder.
  - cancel open order releases exact unused reserve.
  - cancel filled order is rejected.
  - startup rebuild restores open order book.
  - transaction rollback leaves no partial state.
  - outbox event is rolled back with failed order transaction.
- Unit tests:
  - balance calculation.
  - order validators.
  - settlement helper.
  - reserve release math.
- Failure injection:
  - simulate an exception after order insert but before settlement.
  - simulate an exception after settlement but before outbox write.
  - prove database state rolls back consistently.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

### Exit Criteria

- Authenticated users can place, view, and cancel paper orders.
- Trades settle through append-only ledger entries.
- Portfolio reflects ledger-derived balances and reserves.
- Open order book survives restart through rebuild.
- Critical trading invariants are tested against PostgreSQL state.

### Risk Watch

- Risk: reserve logic becomes opaque. Mitigation: document examples and test every state transition.
- Risk: market orders require complex slippage controls. Mitigation: implement conservative prototype policy and document it.
- Risk: transaction boundaries split accidentally. Mitigation: use one application service for order orchestration.

## Milestone 8: Realtime Private Trading Flow

Dates: July 13-July 19, 2026

### Primary Goal

Complete the user-facing realtime trading loop: authenticated private order, trade, and portfolio updates; public order book updates; Redis-backed fanout; and frontend reconciliation between REST snapshots and WebSocket events.

### Why This Milestone Matters

The platform should feel like a trading system, not isolated REST endpoints. This milestone proves backend and frontend can coordinate private and public realtime state safely.

### Deliverables

- Authenticated WebSocket handshakes or auth messages.
- Private channels:
  - `user.orders`
  - `user.trades`
  - `user.portfolio`
- Public trading channels:
  - `orderbook.{symbol}`
  - `market.ticks.{symbol}`
  - `market.candles.{symbol}`
- Redis pub/sub or streams fanout for gateway coordination.
- User-scoped connection matrix.
- Frontend order form:
  - buy/sell selector.
  - limit/market selector.
  - price and quantity fields.
  - estimated cost/proceeds.
  - validation messages.
- Frontend panels:
  - order book.
  - recent trades.
  - open orders.
  - portfolio summary.
  - order status notifications.
- Reconciliation policy for REST snapshots plus WebSocket deltas.

### Engineering Tasks

- Authenticate private subscriptions:
  - Verify token during handshake or auth message.
  - Cross-check active sessions where practical.
  - Reject unauthorized private channel subscriptions immediately.
  - Bind connection identity to user ID and role.
- Publish events after successful transaction commit:
  - order accepted.
  - order rejected.
  - order partially filled.
  - order filled.
  - order cancelled.
  - trade created.
  - portfolio updated.
- Add Redis fanout:
  - API publishes event to Redis channel or stream.
  - WebSocket gateway receives event.
  - Gateway forwards only to matching subscribed connections.
  - Private events are filtered by authenticated user ID.
- Add sequence/idempotency support:
  - event IDs are stable.
  - user-scoped sequence IDs or monotonic timestamps support ordering.
  - frontend reducers discard duplicates and stale messages.
  - reconnect triggers full REST refetch.
- Add frontend mutations:
  - place order.
  - cancel order.
  - refresh open orders.
- Add UI states:
  - insufficient balance.
  - order rejected.
  - order partially filled.
  - cancelled.
  - reconnecting.
  - stale market data.
  - private channel auth expired.

### Documentation Tasks

- Update `docs/events.md` with private event payloads and user-scoping rules.
- Update `docs/api.md` with WebSocket auth flow.
- Add frontend workflow notes:
  - initial REST load.
  - realtime updates.
  - duplicate handling.
  - reconnect/refetch strategy.

### Tests And Verification

- Backend tests:
  - private subscription without token is rejected.
  - private subscription with invalid token is rejected.
  - expired/revoked session cannot subscribe.
  - user receives own order update.
  - user does not receive another user's private update.
  - duplicate event does not cause duplicate state transition.
- Frontend tests:
  - order form validation.
  - order placement success updates open orders.
  - order rejection renders actionable message.
  - WebSocket order update changes status.
  - reconnect triggers refetch.
  - stale event is discarded.
- Cross-tenant validation:
  - two active users trade at the same time.
  - each user sees only their private frames.
  - public order book frames are shared safely.
- Manual verification:
  - two demo users trade against each other.
  - order book updates in browser.
  - portfolio changes after fill.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

### Exit Criteria

- A user can complete the browser workflow: login, view market, place order, see order update, see trade, see portfolio change.
- Private WebSocket data is scoped to the correct user.
- Public order book updates are visible in real time.
- Reconnect behavior does not leave UI stale.
- REST snapshots and WebSocket deltas reconcile idempotently.

### Risk Watch

- Risk: duplicate events corrupt UI state. Mitigation: use event IDs and idempotent reducers.
- Risk: private event leakage. Mitigation: test user scoping explicitly.
- Risk: UI complexity grows fast. Mitigation: keep feature modules and shared formatters clean.

## Milestone 9: Event Streaming And Workers

Dates: July 20-July 26, 2026

### Primary Goal

Turn durable business changes into reliable asynchronous events using the transactional outbox, Redpanda topics, idempotent consumers, retry handling, and dead-letter diagnostics.

### Why This Milestone Matters

Event-driven architecture is an enterprise signal only if delivery is durable, ordered where needed, idempotent, observable, and recoverable under broker failure.

### Deliverables

- Outbox event writer integrated into business transactions.
- Worker entrypoint or module that publishes pending outbox events to Redpanda.
- Redpanda topics:
  - `market.ticks`
  - `market.candles`
  - `orders.events`
  - `trades.events`
  - `ledger.events`
  - `portfolio.events`
  - `audit.events`
  - `dead-letter.events`
- Atomic outbox claiming.
- Retry with backoff.
- Dead-letter handling after maximum attempts.
- Processed-event idempotency table.
- Worker health/status surface.
- Event docs with schemas, versioning, partitioning, and ordering rules.

### Engineering Tasks

- Define outbox states:
  - pending.
  - publishing.
  - published.
  - failed.
  - dead-lettered.
- Implement atomic poller:
  - claim pending events with a single safe query such as `UPDATE ... WHERE id IN (...) RETURNING *` or equivalent Drizzle transaction.
  - prevent multiple workers from publishing the same row concurrently.
  - mark as published only after broker acknowledgement.
  - increment attempts on failure.
  - dead-letter after threshold.
- Configure topic routing:
  - market ticks and candles keyed by `symbol`.
  - order, ledger, and portfolio events keyed by `userId`.
  - trade events keyed by `symbol`.
  - audit events keyed by `userId` or aggregate ID.
- Add idempotent consumers:
  - `processed_events(consumer_group_name, event_id)` unique key.
  - Insert processed marker inside the same transaction as side effects.
  - Acknowledge only after commit succeeds.
- Add worker lifecycle:
  - start.
  - stop.
  - graceful shutdown.
  - health.
  - lag metrics.
- Add consumer examples where useful:
  - portfolio projection.
  - audit stream processor.
  - WebSocket fanout consumer if not covered by Redis.
- Preserve correlation IDs from API request to outbox row to Redpanda message.

### Documentation Tasks

- Fill `docs/events.md` with:
  - topic names.
  - event envelope.
  - payload versioning.
  - partition keys.
  - ordering guarantees.
  - retry and dead-letter behavior.
  - idempotency expectations.
- Update architecture docs with outbox worker flow.
- Add troubleshooting notes:
  - Redpanda unavailable.
  - outbox stuck pending.
  - event dead-lettered.
  - consumer duplicate skipped.

### Tests And Verification

- Unit tests:
  - outbox state transitions.
  - retry decision logic.
  - topic routing.
  - event envelope validation.
  - idempotency conflict handling.
- Integration tests:
  - order transaction writes outbox events.
  - worker publishes pending event.
  - concurrent workers do not claim same event.
  - failed publish increments attempts.
  - repeated failures dead-letter event.
  - successful retry marks published once.
  - duplicate consumed event skips side effects.
- Failure drill:
  - disable Redpanda during trading traffic.
  - verify outbox backlog remains durable.
  - restore Redpanda.
  - verify backlog drains and events publish once.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

### Exit Criteria

- Critical business changes are written to outbox inside the same transaction as database state.
- Worker can publish events reliably to Redpanda.
- Failures retry and eventually become diagnosable dead letters.
- Consumers are idempotent.
- Correlation IDs are present across request, outbox, logs, broker events, and consumers.

### Risk Watch

- Risk: spending too much time on full stream processing. Mitigation: prioritize reliable outbox and one or two meaningful consumers.
- Risk: local Redpanda complexity. Mitigation: runbook explains setup and diagnostics.
- Risk: hidden schema drift. Mitigation: centralize event definitions in `@rtctp/domain`.

## Milestone 10: Admin, Audit, And Product Depth

Dates: July 27-August 2, 2026

### Primary Goal

Add admin/dev visibility, immutable audit trails, trade and order history, richer workflows, cursor pagination, and operational screens that make the system explainable.

### Why This Milestone Matters

Enterprise systems are not only happy-path user flows. They expose enough visibility to answer what happened, when, why, by whom, and whether the platform is healthy.

### Deliverables

- Admin/dev API endpoints:
  - `GET /api/admin/health`
  - `GET /api/admin/audit-events`
  - `GET /api/admin/users`
  - `GET /api/admin/orders`
  - `GET /api/admin/trades`
  - `GET /api/admin/outbox`
- Role-protected admin access.
- Append-only audit events for:
  - auth events.
  - order submission.
  - order rejection.
  - order cancellation.
  - trade creation.
  - ledger entry creation.
  - admin access.
  - security anomalies.
- Cursor pagination for admin and history routes.
- Frontend admin/dev screen:
  - service health.
  - provider health.
  - WebSocket connection stats.
  - event throughput.
  - outbox lag.
  - dead-letter diagnostics.
  - recent errors.
  - links to Grafana, Prometheus, and Jaeger.
- User-facing trade history and order history.

### Engineering Tasks

- Implement audit writer:
  - actor user ID.
  - actor role.
  - event type.
  - target entity.
  - whitelisted metadata.
  - correlation ID.
  - timestamp.
- Enforce append-only audit trail:
  - code exposes no update/delete paths.
  - tests prove repository cannot update historical events.
  - use DB permissions or triggers where practical.
- Add admin authorization middleware:
  - require authenticated user.
  - require `ADMIN` role.
  - return standard `403 FORBIDDEN` envelope.
- Replace offset pagination on mutable/large tables with cursor pagination:
  - `?limit=50&cursor=...`.
  - cursor encodes stable sort tuple, such as `(created_at, id)`.
  - newest-first for audit and history views.
- Add frontend admin route/tab with table states:
  - loading.
  - empty.
  - error.
  - forbidden.
  - pagination.
- Add account menu with current user and logout.

### Documentation Tasks

- Update `docs/api.md` with admin endpoints and cursor pagination examples.
- Update `docs/data-model.md` with audit event examples.
- Add `docs/runbooks/admin-debugging.md`:
  - inspect order failure.
  - trace correlation ID.
  - inspect outbox backlog.
  - inspect dead-letter events.

### Tests And Verification

- Backend tests:
  - normal user cannot access admin endpoints.
  - admin can access admin endpoints.
  - unauthenticated admin access returns `401`.
  - forbidden admin access returns `403`.
  - audit event created for order placement.
  - audit event created for cancellation.
  - audit events are append-only.
  - cursor pagination is stable.
- Frontend tests:
  - admin tab hidden or blocked for non-admin.
  - admin screen renders health state.
  - trade history renders filled trades.
  - order history renders active and terminal statuses.
- Manual verification:
  - place order.
  - cancel order.
  - inspect audit trail.
  - verify admin screen health signals.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

### Exit Criteria

- Admin/dev visibility explains platform health.
- Audit trail can answer who did what and when.
- User history views make trading activity inspectable.
- Admin authorization is tested.
- High-volume history routes use cursor pagination.

### Risk Watch

- Risk: admin screen becomes a dumping ground. Mitigation: organize by health, events, users, trading, and observability.
- Risk: audit logs store sensitive data. Mitigation: whitelist metadata fields and test redaction.
- Risk: pagination is deferred. Mitigation: add cursor pagination before large tables accumulate.

## Milestone 11: Observability

Dates: August 3-August 9, 2026

### Primary Goal

Instrument the platform with structured logs, OpenTelemetry traces, Prometheus metrics, Grafana dashboards, and correlation workflows that allow a failed or successful trade to be debugged end to end.

### Why This Milestone Matters

Strong observability separates a toy project from an operable system. Reviewers should see that the system can be measured, debugged, and explained under failure.

### Deliverables

- Structured JSON logs with:
  - timestamp.
  - level.
  - service name.
  - message.
  - request ID.
  - correlation ID.
  - span ID where available.
  - safe user ID where relevant.
  - route or operation.
- OpenTelemetry tracing for:
  - HTTP requests.
  - auth flow.
  - order placement.
  - balance reservation.
  - matching.
  - settlement.
  - outbox write.
  - outbox publish.
  - market data ingest.
  - WebSocket broadcast.
- Prometheus metrics:
  - HTTP request count, duration, and status.
  - active WebSocket connections.
  - WebSocket messages sent and dropped.
  - market ticks received.
  - provider reconnect count.
  - orders accepted and rejected.
  - trades created.
  - order placement latency.
  - matching latency.
  - outbox lag and publish latency.
  - database operation latency where practical.
  - Redis operation latency where practical.
- Grafana dashboards:
  - API overview.
  - trading overview.
  - market data overview.
  - WebSocket overview.
  - outbox/worker overview.
- Jaeger trace examples.

### Engineering Tasks

- Add telemetry module:
  - tracer provider.
  - meter provider.
  - logger correlation binding.
  - metrics registration.
  - graceful shutdown.
- Add request middleware:
  - request ID.
  - correlation ID.
  - response time.
  - safe error logging.
  - response header echo.
- Propagate correlation IDs through:
  - API response envelope.
  - service calls.
  - DB transaction context.
  - audit events.
  - outbox rows.
  - Redpanda message headers or payload metadata.
  - WebSocket messages.
- Use bounded metric labels:
  - route templates, not raw URLs.
  - symbol, event type, status, and operation names are acceptable.
  - no user IDs, order IDs, token values, raw error messages, or email addresses.
- Add span attributes carefully:
  - route.
  - symbol.
  - order side/type.
  - order status.
  - event type.
  - never secrets or tokens.
- Configure OpenTelemetry Collector in Docker Compose.
- Configure Prometheus scrape targets.
- Store Grafana dashboards as JSON where practical.
- Add trace workflow for a failed order by correlation ID.

### Documentation Tasks

- Add `docs/observability.md`:
  - metrics list.
  - trace list.
  - log format.
  - dashboard links.
  - correlation ID workflow.
  - high-cardinality label rules.
- Update README with observability startup commands and local URLs.
- Add screenshots or regeneration instructions for dashboards and traces.

### Tests And Verification

- Unit tests:
  - correlation ID propagation helpers.
  - metric label generation.
  - log redaction.
  - envelope metadata generation.
- Integration tests:
  - API responses include or propagate correlation ID.
  - errors include correlation ID.
  - metrics endpoint exposes expected metric names.
  - outbox events preserve correlation ID.
- Manual verification:
  - place successful order.
  - trigger failed order.
  - find logs by correlation ID.
  - find trace in Jaeger.
  - see order/trade metrics in Prometheus/Grafana.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

### Exit Criteria

- A failed or successful order can be traced from API request to DB transaction to outbox event to WebSocket update.
- Dashboards show useful local health.
- Metrics names and trace coverage are documented.
- Logs are structured, single-line, and safe.

### Risk Watch

- Risk: observability code spreads everywhere. Mitigation: centralize helpers and instrument boundaries.
- Risk: high-cardinality metrics. Mitigation: enforce bounded labels during review.
- Risk: dashboards become manual-only. Mitigation: store JSON dashboards or clear regeneration steps.

## Milestone 12: Performance And Reliability

Dates: August 10-August 16, 2026

### Primary Goal

Measure and harden the system under realistic local prototype pressure: REST reads, order placement, matching, WebSocket fanout, market-data bursts, provider reconnects, slow clients, graceful shutdown, and worker recovery.

### Why This Milestone Matters

Performance claims without measurements are weak. Reliability claims without failure drills are weaker. This milestone creates evidence and improves bottlenecks discovered by measurement.

### Deliverables

- `docs/benchmarks.md` with measured local results.
- k6 load tests:
  - auth/login baseline if useful.
  - portfolio reads.
  - order placement.
  - rate limits.
  - WebSocket subscriptions where practical.
- Matching engine benchmark results.
- WebSocket fanout benchmark or stress script.
- Market data fixture replay burst test.
- Backpressure behavior documented and tested.
- Reliability drills:
  - provider disconnect.
  - Redis restart.
  - Redpanda unavailable.
  - database transaction failure.
  - worker crash/restart.
  - application shutdown.

### Engineering Tasks

- Add `test:load` or equivalent script.
- Add k6 scripts under `tests/load` or `apps/api/test/load`.
- Define benchmark environment:
  - machine assumptions.
  - Docker resource limits.
  - service versions.
  - seed dataset size.
- Establish local prototype targets:
  - REST database reads: p95 <= 20ms under documented small local load.
  - order placement and matching pipeline: p95 <= 30ms for local demo load.
  - market data update to connected frontend: p95 <= 50ms during fixture replay.
  - matching engine benchmark reports throughput and p95 operation time.
  - outbox publish lag remains visible and bounded under normal local load.
- Add protective limits:
  - request body size.
  - WebSocket message queue size.
  - max subscriptions per connection.
  - auth and order-placement rate limits.
  - bounded frontend chart/window state.
- Add graceful shutdown:
  - stop accepting new HTTP requests.
  - stop accepting new WebSocket subscriptions.
  - finish or safely cancel active worker batch.
  - flush metrics/logs.
  - close Redis, Redpanda, WebSocket, and DB connections.
- Optimize only measured bottlenecks:
  - missing indexes.
  - inefficient portfolio queries.
  - excessive event payloads.
  - chatty frontend refetching.
  - hot-path decimal conversions.

### Documentation Tasks

- Fill `docs/benchmarks.md` with:
  - commands.
  - hardware/local environment.
  - dataset.
  - scenarios.
  - results.
  - bottlenecks.
  - follow-up items.
- Add `docs/runbooks/reliability-drills.md`:
  - how to simulate failures.
  - expected behavior.
  - recovery checks.
  - known limitations.

### Tests And Verification

- Automated tests:
  - rate limit behavior.
  - slow WebSocket client handling where testable.
  - worker retry on Redpanda failure using mocks or local integration.
  - database rollback preserves invariants.
  - order-book rebuild from PostgreSQL after process restart.
- Manual/load tests:
  - run k6 order placement.
  - run WebSocket fanout script.
  - run fixture burst replay.
  - stop Redis and observe degraded behavior/recovery.
  - stop Redpanda and verify outbox backlog.
  - restart worker and verify pending outbox drains.
  - send `SIGTERM` and verify graceful shutdown logs.
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run test:load` if implemented

### Exit Criteria

- Performance targets are met or misses are transparently documented with follow-ups.
- Reliability drills have expected behavior and recovery notes.
- Backpressure, rate limits, and graceful shutdown are implemented.
- Benchmark docs provide credible portfolio evidence.

### Risk Watch

- Risk: chasing unrealistic production performance. Mitigation: local prototype targets are enough; focus on correctness and evidence.
- Risk: load tests become flaky. Mitigation: use stable seed data and document environment assumptions.
- Risk: optimizing before measuring. Mitigation: benchmark first, then tune real bottlenecks.

## Milestone 13: Security, Accessibility, And Correctness Hardening

Dates: August 17-August 23, 2026

### Primary Goal

Run a hardening pass across security, authorization, input validation, accessibility, error handling, fuzzing, edge cases, and trading invariants.

### Why This Milestone Matters

Most portfolio projects fail under hostile inputs, permission boundaries, edge cases, and UI accessibility. This milestone deliberately attacks the system before reviewers do.

### Deliverables

- `docs/security.md` threat model.
- `docs/accessibility.md` checklist.
- Security checklist completed.
- Accessibility checklist completed.
- Expanded invariant tests.
- Error response consistency audit.
- Frontend loading/empty/error/reconnect states verified.
- Dependency audit documented.
- Fuzzing or malformed-input tests for REST and WebSocket boundaries.

### Engineering Tasks

- Security review:
  - all private REST routes require auth.
  - admin routes require admin role.
  - private WebSocket channels require auth.
  - users cannot access other users' orders, trades, portfolio, or private events.
  - CORS is locked to allowed local origins.
  - JWT secrets are validated at startup.
  - refresh tokens are stored hashed.
  - passwords/tokens/secrets never enter logs.
  - request validation exists on all external inputs.
  - rate limits exist on auth, order placement, and WebSocket connection attempts.
- Input validation:
  - order decimals are positive strings with allowed scale.
  - symbols match supported symbols.
  - pagination cursors are opaque and validated.
  - malformed JSON returns safe error envelope.
  - WebSocket message type/channel is validated.
  - corrupted tokens return safe auth errors.
- Trading correctness review:
  - no negative balances.
  - reserve math under partial fills.
  - cancellation releases exactly unused reserve.
  - market order behavior under insufficient liquidity.
  - restart rebuild consistency.
  - duplicate event handling.
  - transaction rollback behavior.
  - ledger and audit append-only behavior.
- Accessibility review:
  - keyboard navigation.
  - focus states.
  - input labels.
  - table semantics.
  - chart alternatives or summaries.
  - color is not the only status indicator.
  - responsive layout.
  - text does not overflow controls.
- Error handling review:
  - consistent response envelope.
  - correlation ID on internal errors.
  - validation errors include safe field details.
  - order rejections are user-actionable.
  - async errors visible in admin/dev tools.

### Documentation Tasks

- Add `docs/security.md`:
  - threat model.
  - trust boundaries.
  - session management.
  - validation layers.
  - logging/redaction policy.
  - local-only assumptions.
  - non-goals.
- Add `docs/accessibility.md`:
  - checklist.
  - verification steps.
  - known gaps.
- Update `docs/trading-invariants.md` with new edge cases discovered.
- Update `docs/code-review.md` with hardening checks.

### Tests And Verification

- Add or expand tests:
  - cross-user REST access denied.
  - cross-user WebSocket event leak prevented.
  - admin-only endpoints blocked for normal user.
  - malformed request bodies rejected.
  - invalid symbols rejected.
  - invalid decimal strings rejected.
  - invalid order states rejected.
  - duplicate cancellation behavior.
  - concurrent order placement.
  - ledger entries remain append-only.
  - audit events remain append-only.
  - refresh token replay behavior.
  - corrupted WebSocket tokens rejected.
- Run:
  - `npm audit` or document why not used.
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Manual verification:
  - keyboard-only trading workflow.
  - mobile viewport trading workflow.
  - forced backend errors show useful messages.
  - browser console has no unexpected errors during main flows.

### Exit Criteria

- Critical permissions are tested.
- Trading invariants have strong coverage.
- UI passes practical accessibility review.
- Security assumptions and non-goals are documented.
- Known residual risks are explicit and acceptable for a local paper-trading prototype.

### Risk Watch

- Risk: discovering major correctness bugs late. Mitigation: prioritize invariant fixes over UI polish.
- Risk: accessibility becomes superficial. Mitigation: test keyboard and labels manually.
- Risk: dependency audit noise. Mitigation: document findings and fix high-impact issues first.

## Milestone 14: Developer Experience And Portfolio Packaging

Dates: August 24-August 30, 2026

### Primary Goal

Make the project easy to run, demo, inspect, and understand. Package the engineering story with one-command setup, runbooks, screenshots, architecture docs, demo data, and reviewer-focused guidance.

### Why This Milestone Matters

A strong project can still fail review if setup is painful or the story is unclear. This milestone turns the working system into a portfolio-quality artifact.

### Deliverables

- One-command or near-one-command local startup path.
- Seed/demo data script.
- Updated README with:
  - project summary.
  - architecture diagram.
  - setup commands.
  - demo workflow.
  - feature list.
  - quality commands.
  - observability links.
  - screenshots.
  - limitations.
- Runbooks:
  - local development.
  - troubleshooting.
  - admin debugging.
  - reliability drills.
- Architecture docs:
  - service overview.
  - data model.
  - event model.
  - matching engine.
  - trading invariants.
  - observability.
- Demo script:
  - register/login.
  - observe live market.
  - place limit order.
  - match against another user.
  - see order/trade/portfolio updates.
  - inspect admin/audit/observability.
- Screenshots:
  - trading dashboard.
  - admin/dev console.
  - Grafana dashboard.
  - Jaeger trace.
- `docs/reviewer-guide.md`.
- `docs/cv-notes.md` draft.

### Engineering Tasks

- Smooth setup:
  - verify `.env.example`.
  - verify Docker Compose health checks.
  - verify migrations and seed script.
  - add root script such as `npm run infrastructure:init` or equivalent.
  - document ports.
- Improve startup feedback:
  - print API URL.
  - print web URL.
  - print health endpoint.
  - print Grafana/Prometheus/Jaeger URLs.
  - print seeded demo accounts.
  - print degraded service warnings clearly.
- Add demo data:
  - admin user.
  - two normal users.
  - starter balances.
  - optional historical ticks/candles.
  - optional open orders for visible book depth.
- Clean repo:
  - remove obsolete files.
  - ensure generated artifacts are ignored unless intentionally tracked.
  - ensure docs match reality.
  - ensure comments are useful and not noisy.
- Verify install from a clean clone or clean folder simulation.

### Documentation Tasks

- Rewrite README for reviewers:
  - what this demonstrates.
  - how to run.
  - what to click.
  - how to verify quality.
  - what is intentionally out of scope.
- Add `docs/reviewer-guide.md`:
  - fastest path to understand the codebase.
  - key files to inspect.
  - key tests to run.
  - architecture highlights.
  - tradeoffs.
  - known limitations.
- Add `docs/cv-notes.md`:
  - concise project bullets.
  - quantified metrics where available.
  - interview talking points.
  - hardest engineering problems solved.
  - correctness and reliability story.

### Tests And Verification

- Fresh environment verification:
  - remove local containers/volumes if safe and documented.
  - install dependencies.
  - start Docker Compose.
  - migrate and seed.
  - start API and web.
  - complete demo workflow.
- Quality gates:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run test:load` if available
- Visual verification:
  - desktop screenshot.
  - mobile screenshot.
  - admin console screenshot.
  - dashboard links work.

### Exit Criteria

- A reviewer can run the project with minimal guidance.
- Docs explain both product behavior and engineering decisions.
- Demo workflow is reliable.
- Screenshots and runbooks support the portfolio story.
- Known limitations are honest and documented.

### Risk Watch

- Risk: docs overclaim features. Mitigation: describe only what works and label future work.
- Risk: setup depends on hidden local state. Mitigation: test from clean local state.
- Risk: screenshots become stale. Mitigation: regenerate after final UI changes.

## Milestone 15: Final Stabilization And Launch Package

Dates: August 31-September 6, 2026

### Primary Goal

Stabilize, verify, record, and package the final version so it is ready for GitHub, CV use, portfolio review, and technical interview discussion.

### Why This Milestone Matters

The final milestone is not for major architecture changes. It is for making the project trustworthy: final bug fixes, clean docs, final tests, benchmark evidence, polished demo, and a clear engineering narrative.

### Deliverables

- Release candidate branch or tag.
- Scope freeze declaration.
- Final full-stack QA pass.
- Final README and docs pass.
- Final screenshots and demo video or demo script.
- Final benchmark numbers.
- Final architecture review.
- Final security/correctness checklist.
- Final `docs/cv-notes.md`.
- Post-launch backlog for future improvements.

### Engineering Tasks

- Enforce scope freeze:
  - no major new features.
  - no large refactors unless required to fix release-blocking defects.
  - changes limited to functional bugs, docs corrections, test stabilization, and evidence capture.
- Run manual demo multiple times:
  - fresh login.
  - market data live or fixture replay.
  - place buy order.
  - place matching sell order.
  - observe fills.
  - cancel open order.
  - inspect portfolio.
  - inspect audit log.
  - inspect metrics/traces.
- Fix final bugs only if they protect core functionality.
- Final cleanup:
  - remove dead code.
  - remove unused dependencies.
  - verify `.env.example`.
  - verify Docker Compose service names.
  - verify generated artifacts are ignored or intentionally tracked.
  - verify no secrets are committed.
- Prepare release notes:
  - completed features.
  - architecture highlights.
  - test summary.
  - benchmark summary.
  - known limitations.
  - future roadmap.

### Documentation Tasks

- Finalize README:
  - concise opening.
  - screenshots.
  - architecture.
  - local setup.
  - demo workflow.
  - quality checks.
  - observability.
  - limitations.
- Finalize:
  - `docs/reviewer-guide.md`
  - `docs/benchmarks.md`
  - `docs/security.md`
  - `docs/trading-invariants.md`
  - `docs/observability.md`
  - `docs/cv-notes.md`
- Add post-launch roadmap:
  - optional Kubernetes manifests.
  - optional frontend deployment.
  - optional replayable market-data simulator.
  - optional more symbols.
  - optional advanced order types.
  - optional hosted demo with paper-only constraints.

### Tests And Verification

- Full quality gates:
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e` if implemented
  - `npm run test:load` if implemented
- Manual final checks:
  - clean local startup.
  - complete demo workflow.
  - browser console has no unexpected errors.
  - API logs are structured.
  - metrics endpoint works.
  - Grafana dashboard loads.
  - Jaeger trace appears.
  - no secrets committed.
  - docs commands match reality.
- GitHub/reviewer checks:
  - CI passes if configured.
  - repository description and topics are set if publishing.
  - screenshots render.
  - README does not overclaim production readiness.

### Exit Criteria

- The system can be demoed from scratch without hand-waving.
- Core trading workflow works end to end.
- Critical tests and quality gates pass.
- Observability evidence is available.
- README and reviewer docs are accurate.
- CV/interview notes explain the engineering value clearly.

### Risk Watch

- Risk: late features destabilize release. Mitigation: freeze scope and focus on defects.
- Risk: docs drift after final fixes. Mitigation: update docs in the same final pass.
- Risk: demo depends on live provider availability. Mitigation: keep fixture replay or seed fallback ready.

## Workstream Checklist

Use this section as a cross-milestone tracker.

### Backend

- [ ] Workspace import boundaries and circular dependency checks.
- [ ] Database migrations and seed data.
- [ ] Transaction-scoped repositories.
- [ ] Auth and session flow.
- [ ] Refresh token rotation and replay detection.
- [ ] Redis-backed rate limiting.
- [ ] Market data ingestion.
- [ ] Bounded ingest queue and fixture replay.
- [ ] Candle aggregation.
- [ ] Pure matching engine.
- [ ] Order placement.
- [ ] Reserve locking.
- [ ] Cancellation.
- [ ] Ledger settlement.
- [ ] Portfolio calculation.
- [ ] Audit log.
- [ ] Transactional outbox writer.
- [ ] Outbox worker.
- [ ] Redpanda publishing.
- [ ] Idempotent consumers.
- [ ] Redis fanout.
- [ ] Health checks.
- [ ] Metrics and traces.
- [ ] Graceful shutdown.

### Frontend

- [ ] Auth screens.
- [ ] Trading dashboard layout.
- [ ] Symbol selector.
- [ ] Live price panel.
- [ ] Chart.
- [ ] Order form.
- [ ] Order book.
- [ ] Recent trades.
- [ ] Open orders.
- [ ] Portfolio summary.
- [ ] Trade/order history.
- [ ] Admin/dev console.
- [ ] WebSocket reconnect and refetch.
- [ ] Idempotent event reconciliation.
- [ ] Loading, empty, error, stale, and reconnect states.
- [ ] Responsive and accessible polish.
- [ ] Render throttling for streaming data.

### Data And Correctness

- [ ] Numeric precision strategy.
- [ ] Financial string boundaries.
- [ ] Append-only ledger.
- [ ] Append-only audit trail.
- [ ] Reserve and release rules.
- [ ] Trade settlement rules.
- [ ] Order state machine.
- [ ] Startup order book rebuild.
- [ ] Idempotent event handling.
- [ ] Dead-letter handling.
- [ ] Cross-user isolation.
- [ ] Trading invariant tests.
- [ ] Failure injection tests.

### DevOps And Observability

- [ ] Docker Compose health.
- [ ] PostgreSQL local setup.
- [ ] Redis local setup.
- [ ] Redpanda local setup.
- [ ] Prometheus local setup.
- [ ] Grafana dashboards.
- [ ] Jaeger traces.
- [ ] OpenTelemetry propagation.
- [ ] Structured JSON logs.
- [ ] k6 load tests.
- [ ] Benchmark docs.
- [ ] Reliability drills.
- [ ] CI checks.
- [ ] Runbooks.

### Portfolio Evidence

- [ ] README with screenshots.
- [ ] Architecture diagram.
- [ ] Data model docs.
- [ ] Event model docs.
- [ ] Matching engine docs.
- [ ] Trading invariants docs.
- [ ] Security docs.
- [ ] Accessibility docs.
- [ ] Observability docs.
- [ ] Benchmark results.
- [ ] Reviewer guide.
- [ ] Demo script.
- [ ] CV bullets.
- [ ] Interview talking points.

## Priority Rules

If schedule pressure appears, protect the highest-signal work first.

### P0: Must Have

- Authenticated paper trading.
- Live market data or reliable fixture replay fallback.
- Deterministic matching engine.
- Transactional orders, reserves, trades, ledger entries, audit events, and outbox writes.
- Portfolio view.
- Realtime WebSocket updates.
- Trading invariant tests.
- README and local runbook.
- Basic observability.

### P1: Should Have

- Redpanda outbox worker.
- Idempotent consumers.
- Admin/dev console.
- Grafana dashboards.
- k6 load tests.
- Detailed benchmark docs.
- Strong frontend polish.
- Demo video and screenshots.

### P2: Nice To Have

- Kubernetes or Helm examples.
- Terraform examples.
- Advanced charting interactions.
- Multiple market data providers active at the same time.
- Advanced order types beyond limit and market.
- Public hosted frontend.

## Scope Control

Avoid these until the core platform is complete:

- Real-money trading.
- Exchange custody.
- Deposits or withdrawals.
- Payment processing.
- Advanced compliance claims.
- Complex microservice split before module boundaries are stable.
- Multi-region architecture.
- High-frequency trading claims.
- Paid APIs or paid cloud services.
- Large analytics systems unrelated to trading correctness.

## Final Review Questions

Before declaring the 15-milestone plan complete, answer these honestly:

- Can a reviewer run the project locally from the README without hidden knowledge?
- Does the trading workflow work end to end from browser to database to realtime updates?
- Can the order book be rebuilt from durable PostgreSQL state?
- Are trading invariants tested, especially balances, reserves, fills, and cancellation?
- Can a failed order be traced by correlation ID?
- Are metrics and dashboards useful enough to debug the system?
- Does the frontend handle loading, error, reconnect, empty, stale, and mobile states?
- Are docs accurate and free of exaggerated production claims?
- Are known limitations documented?
- Can the project be explained clearly in a technical interview in under five minutes?
