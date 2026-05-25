# Enterprise Delivery Roadmap

Project: Real-Time Crypto Trading Platform  
Planning window: May 25, 2026 through September 6, 2026  
Target outcome: a local-first, zero-cost, production-style paper trading platform that demonstrates backend and full-stack engineering depth at a FAANG-like review bar.

This plan assumes the current repository state is an early TypeScript monorepo with:

- `apps/api` for the Express API and WebSocket gateway skeleton.
- `apps/web` for the React/Vite trading dashboard shell.
- `packages/domain` for shared domain types.
- `docker-compose.yml` for PostgreSQL, Redis, Redpanda, Prometheus, Grafana, and Jaeger.
- Top-level architecture and product specs in `README.md`, `SPEC.md`, and `ARCHITECTURE.md`.

The project remains a paper-trading prototype. It must not support real money deposits, withdrawals, custody, external order routing, payment processing, or compliance claims.

## North Star

By the end of Milestone 15, the project should be easy for a reviewer to run, inspect, test, and trust:

- A developer can run the full local stack with documented commands.
- A user can register, login, view live BTC/ETH market data, place paper trades, cancel orders, and see portfolio updates in real time.
- The backend preserves critical trading invariants: no negative balances, no fill without trades, no settlement without append-only ledger entries, no open filled orders, and no untracked order state mutation.
- The matching engine is deterministic and heavily tested.
- PostgreSQL is the system of record; Redis and in-memory books are rebuildable derived state.
- Critical state changes publish durable events through an outbox before fanout.
- Observability is visible through structured logs, metrics, traces, dashboards, and documented benchmark results.
- The codebase has enough docs, tests, and runbooks to feel like a serious engineering artifact instead of a demo-only app.

## Enterprise Quality Bar

Treat every feature as incomplete until it has implementation, validation, tests, documentation, and operational visibility.

### Engineering Bar

- Strict TypeScript throughout API, web, and shared packages.
- Clear module boundaries: auth, users, market data, orders, matching, ledger, portfolio, websocket, audit, telemetry.
- Domain logic kept out of controllers and React components.
- Request and event payloads validated with Zod or equivalent schemas.
- Database writes wrapped in explicit transaction boundaries.
- Business events carry stable IDs, timestamps, correlation IDs, aggregate identifiers, and versioned payloads.
- Redis usage limited to cache, rate limits, pub/sub, streams, and derived snapshots.
- No secrets, tokens, passwords, or private data in logs.

### Product Bar

- Trading screen supports repeated daily use: live price, chart, order form, order book, recent trades, open orders, and portfolio summary are visible without hunting.
- Admin/dev screen exposes feed status, service health, event throughput, reconnects, error counts, and observability links.
- Errors are actionable: validation failures identify fields, auth failures are safe, order rejections explain the trading reason, internal errors include correlation IDs.
- UI is keyboard accessible, responsive, and stable under loading, empty, error, and reconnect states.

### Reliability Bar

- Market data reconnects with backoff and reports provider health.
- WebSocket connections have heartbeat, subscription validation, auth for private channels, and slow-client protection.
- In-memory order books rebuild from durable open orders during startup.
- Async failures retry and eventually move to a dead-letter stream/table with visible diagnostics.
- Load tests and benchmarks document local prototype limits.

### Review Bar

- Every major milestone should produce evidence:
  - passing commands.
  - screenshots or short demo clips.
  - docs updates.
  - architecture notes or ADRs.
  - tests for important invariants.
  - benchmark numbers where relevant.

## Milestone Operating Cadence

Use a lightweight but disciplined milestone cadence.

- Monday: define the milestone scope, select must-ship items, create or update issues/tasks, confirm acceptance criteria.
- Tuesday to Thursday: implement the core vertical slice, keeping PRs reviewable and tests close to the code.
- Friday: integrate, harden, run quality gates, update docs, record evidence.
- Buffer period: fix defects, reduce debt, refine UI, prepare next milestone.

For each milestone:

- Keep one primary milestone and at most two supporting goals.
- Prefer vertical slices that work end to end over isolated partial systems.
- Do not mark a feature complete without tests and docs.
- Track deferred items explicitly instead of hiding them in code comments.

## Global Definition Of Done

Before any milestone is considered done:

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes unless a known temporary limitation is documented.
- New external inputs have validation.
- New critical paths have unit or integration tests.
- New backend behavior has structured logs and correlation IDs where relevant.
- New user-facing or operator-facing behavior has clear error states.
- Documentation is updated when behavior, commands, data models, or architecture change.

For trading-specific milestones:

- No negative cash or asset balance is possible through the public API.
- No accepted order can exist without reserve handling.
- No trade can exist without matching ledger entries.
- Cancellation releases unused reserves.
- Filled orders are not left open.
- Matching is deterministic across repeated runs.

## Timeline Summary

| Milestone | Dates               | Primary Theme                                      | Outcome                                                                     |
| --------- | ------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| 1         | May 25-May 31, 2026 | Architecture lock and delivery foundation          | Finalize technical decisions, docs skeleton, issue map, CI baseline         |
| 2         | Jun 1-Jun 7, 2026   | Database foundation and domain model               | PostgreSQL schema, migrations, repositories, seed data                      |
| 3         | Jun 8-Jun 14, 2026  | Auth, sessions, and security baseline              | Register/login/refresh/logout, protected routes, rate limits                |
| 4         | Jun 15-Jun 21, 2026 | Market data ingestion                              | Coinbase/Binance adapter, normalized ticks, candles, provider health        |
| 5         | Jun 22-Jun 28, 2026 | Realtime gateway and market UI                     | Public WebSocket channels, live dashboard, chart, reconnect states          |
| 6         | Jun 29-Jul 5, 2026  | Matching engine core                               | Deterministic price-time priority engine with deep unit tests               |
| 7         | Jul 6-Jul 12, 2026  | Orders, reserves, ledger settlement                | Transactional order placement, fills, cancellations, portfolio views        |
| 8         | Jul 13-Jul 19, 2026 | Realtime private trading flow                      | User order/trade/portfolio WebSocket updates and Redis fanout               |
| 9         | Jul 20-Jul 26, 2026 | Event streaming and workers                        | Outbox, Redpanda topics, idempotent consumers, dead-letter handling         |
| 10        | Jul 27-Aug 2, 2026  | Admin, audit, and product depth                    | Admin/dev console, audit log, trade history, polished workflows             |
| 11        | Aug 3-Aug 9, 2026   | Observability                                      | OpenTelemetry, Prometheus metrics, Grafana dashboards, trace coverage       |
| 12        | Aug 10-Aug 16, 2026 | Performance and reliability                        | k6 load tests, WebSocket fanout tests, backpressure, recovery drills        |
| 13        | Aug 17-Aug 23, 2026 | Security, accessibility, and correctness hardening | Threat model, permission checks, a11y pass, invariant tests                 |
| 14        | Aug 24-Aug 30, 2026 | Developer experience and portfolio packaging       | Runbooks, demo data, screenshots, architecture docs, one-command local flow |
| 15        | Aug 31-Sep 6, 2026  | Final stabilization and launch package             | Release candidate, final QA, demo script, CV/interview assets               |

## Milestone 1: Architecture Lock And Delivery Foundation

Dates: May 25-May 31, 2026

### Primary Goal

Convert the existing scaffold into an execution-ready engineering plan with stable decisions, visible backlog, documented architecture choices, and a clean quality baseline.

### Why This Milestone Matters

The project has many moving parts: trading, realtime data, database consistency, event streaming, observability, and UI. Milestone 1 prevents later churn by deciding how modules communicate, what belongs in each package, and how completion will be measured.

### Deliverables

- Confirm final scope for the 15-milestone build.
- Create `docs/adr` and write initial ADRs:
  - PostgreSQL as source of truth.
  - Redis for cache, rate limiting, and realtime coordination.
  - Redpanda for Kafka-compatible local event streaming.
  - Outbox pattern for durable business events.
  - Paper trading only, no real money.
  - ORM choice: Prisma or Drizzle.
- Create docs skeleton:
  - `docs/runbooks/local-development.md`
  - `docs/runbooks/troubleshooting.md`
  - `docs/api.md`
  - `docs/events.md`
  - `docs/data-model.md`
  - `docs/benchmarks.md`
  - `docs/code-review.md`
- Convert current `todo.md` milestones into issue-sized tasks.
- Validate the root scripts and workspace commands.
- Define package/module ownership boundaries.

### Engineering Tasks

- Audit current `apps/api`, `apps/web`, and `packages/domain` structure.
- Decide whether the API will keep ingestor, worker, and WebSocket gateway in one process initially or expose separate entrypoints.
- Define folder layout for API modules:
  - `modules/auth`
  - `modules/users`
  - `modules/market-data`
  - `modules/orders`
  - `modules/matching`
  - `modules/ledger`
  - `modules/portfolio`
  - `modules/audit`
  - `modules/websocket`
  - `infra/db`
  - `infra/redis`
  - `infra/redpanda`
  - `infra/telemetry`
- Define shared domain package responsibilities:
  - domain enums.
  - event names.
  - shared API DTO types where useful.
  - order/trade/ledger invariant helpers.
- Define API response envelope standards:
  - success body shape.
  - validation error body shape.
  - auth error body shape.
  - internal error body with correlation ID.
- Decide test split:
  - unit tests near domain modules.
  - integration tests under `apps/api/test`.
  - frontend tests near components or features.
  - future e2e tests under `apps/web/e2e` or top-level `e2e`.

### Documentation Tasks

- Update `README.md` with the current setup reality, not aspirational commands only.
- Add a local development runbook with:
  - required tools.
  - environment setup.
  - Docker Compose startup.
  - API/web startup.
  - quality commands.
  - common failures.
- Add a code review checklist that emphasizes trading invariants, transactions, validation, auth, and observability.

### Tests And Verification

- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.
- Confirm Docker Compose services start or document blockers.
- Verify CI workflow matches local quality commands.
- Confirm ignored build artifacts do not pollute Git status.

### Exit Criteria

- Architecture decisions are documented enough that future milestones do not repeatedly reopen them.
- The repository has a clear docs structure.
- Local quality commands pass or failures are documented with owners.
- Backlog is broken into reviewable chunks.
- No feature is falsely represented as complete.

### Risk Watch

- Risk: over-designing before building. Mitigation: ADRs should be short and decision-focused.
- Risk: choosing an ORM late. Mitigation: decide this milestone because migrations and repository patterns start in Milestone 2.
- Risk: docs becoming stale. Mitigation: every later milestone includes docs updates in its definition of done.

## Milestone 2: Database Foundation And Domain Model

Dates: June 1-June 7, 2026

### Primary Goal

Build the durable state foundation: schema, migrations, transaction utilities, repositories, seed data, and domain types for users, balances, orders, trades, ledger entries, audit events, market data, and outbox events.

### Why This Milestone Matters

The platform's credibility depends on data correctness. Trading systems are judged by state transitions and auditability, not just working endpoints. Milestone 2 creates the database layer that later auth, trading, and event flows rely on.

### Deliverables

- ORM or query builder installed and configured.
- Migration system wired into local development.
- PostgreSQL schema for:
  - users.
  - sessions or refresh tokens.
  - symbols.
  - orders.
  - trades.
  - ledger entries.
  - market ticks.
  - candles.
  - audit events.
  - outbox events.
- Seed script for:
  - BTC/ETH symbols.
  - one admin/dev user.
  - optional demo users.
  - initial paper balances through ledger entries.
- Repository or data access layer with transaction support.
- Database health check that verifies connectivity.

### Engineering Tasks

- Add database configuration using environment variables:
  - `DATABASE_URL`.
  - connection pool size.
  - migration mode.
- Create schema constraints:
  - unique user email.
  - unique symbol code.
  - valid order side, type, and status.
  - non-negative order quantities.
  - positive trade quantities.
  - ledger entries append-only by code convention and database permissions if practical.
  - outbox status enum.
- Add indexes:
  - open orders by symbol, side, price, created time.
  - orders by user and status.
  - trades by symbol and created time.
  - ledger entries by user and asset.
  - outbox events by status and created time.
  - market ticks by symbol and timestamp.
- Implement a transaction helper:
  - accepts a callback.
  - passes a scoped database client.
  - translates known database errors into typed application errors.
- Implement initial repositories:
  - user repository.
  - session repository.
  - symbol repository.
  - ledger repository.
  - audit repository.
  - outbox repository.
- Define money/quantity precision strategy:
  - store decimal values safely.
  - avoid JavaScript floating point for critical calculations.
  - use integer minor units or a decimal library consistently.

### Domain Tasks

- Add domain enums:
  - `OrderSide`.
  - `OrderType`.
  - `OrderStatus`.
  - `LedgerEntryType`.
  - `Asset`.
  - `AuditEventType`.
  - `OutboxEventStatus`.
- Add domain invariant helpers:
  - `isTerminalOrderStatus`.
  - `canCancelOrder`.
  - `requiresLimitPrice`.
  - `validateOrderQuantity`.
- Define event metadata:
  - event ID.
  - event type.
  - aggregate type.
  - aggregate ID.
  - timestamp.
  - correlation ID.
  - causation ID.
  - payload version.

### Documentation Tasks

- Fill `docs/data-model.md` with:
  - table descriptions.
  - relationships.
  - important constraints.
  - index rationale.
  - source-of-truth boundaries.
- Add ADR for numeric precision.
- Add seed data instructions to the local runbook.

### Tests And Verification

- Add integration tests that run against a test database or a well-isolated local database.
- Test migrations from empty database to latest schema.
- Test seed script idempotency.
- Test repository transaction rollback on failure.
- Test ledger repository append behavior.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - migration command.
  - seed command.

### Exit Criteria

- A fresh local database can be migrated and seeded predictably.
- The API can verify database health.
- Core schema is documented.
- Numeric precision rules are decided.
- Later milestones can build auth and trading without reworking the schema from scratch.

### Risk Watch

- Risk: decimal handling bugs. Mitigation: decide and test precision strategy before any trading code.
- Risk: schema churn. Mitigation: allow migrations to evolve, but keep trading invariants stable.
- Risk: integration tests being slow. Mitigation: keep database tests focused and create reliable test setup helpers.

## Milestone 3: Auth, Sessions, And Security Baseline

Dates: June 8-June 14, 2026

### Primary Goal

Implement secure user registration, login, refresh, logout, protected routes, demo balance seeding, and baseline API security controls.

### Why This Milestone Matters

Private trading features depend on a reliable identity layer. A reviewer will quickly notice weak auth, unsafe token storage, missing validation, or poor error handling.

### Deliverables

- Register endpoint: `POST /api/auth/register`.
- Login endpoint: `POST /api/auth/login`.
- Refresh endpoint: `POST /api/auth/refresh`.
- Logout endpoint: `POST /api/auth/logout`.
- Current user endpoint: `GET /api/me`.
- Password hashing with Argon2 or bcrypt.
- Short-lived JWT access token.
- Hashed refresh token persistence.
- Auth middleware for protected routes.
- Redis-backed rate limiting for auth endpoints.
- Demo paper balance seeding for new users through ledger entries.
- Basic frontend auth flow and protected app shell.

### Engineering Tasks

- Add Zod validation schemas for all auth requests.
- Normalize auth errors:
  - invalid credentials must not reveal whether email exists.
  - expired token should be distinguishable from malformed token internally.
  - public response should be safe and concise.
- Implement password policy:
  - minimum length.
  - maximum length to avoid abuse.
  - common input validation.
- Implement refresh token rotation:
  - hash stored token.
  - revoke old token on refresh.
  - invalidate all sessions on suspicious reuse if feasible.
- Add auth audit events:
  - user registered.
  - login success.
  - login failure.
  - token refreshed.
  - logout.
- Add role support:
  - `USER`.
  - `ADMIN`.
- Seed demo balances:
  - USD paper cash.
  - optional BTC/ETH starter balances.
  - append-only ledger entries with clear entry types.
- Add frontend auth state:
  - login form.
  - register form.
  - token handling.
  - authenticated API client.
  - protected dashboard route or view.

### Security Tasks

- Add request IDs and correlation IDs for auth paths.
- Lock CORS to the local frontend origin in development.
- Ensure no password, token, hash, or secret appears in logs.
- Add basic security headers where appropriate.
- Validate environment secrets at startup.
- Ensure auth endpoints have rate limits.

### Documentation Tasks

- Update `docs/api.md` with auth endpoints and examples.
- Update `docs/data-model.md` with user/session tables.
- Add security notes to the local runbook:
  - JWT secret setup.
  - refresh token behavior.
  - local-only assumptions.

### Tests And Verification

- Unit tests:
  - password hashing wrapper.
  - token creation and verification.
  - validation schemas.
- Integration tests:
  - register happy path.
  - duplicate email.
  - login success.
  - login wrong password.
  - refresh token success.
  - revoked refresh token failure.
  - protected endpoint without token.
  - protected endpoint with valid token.
  - rate limit behavior if practical.
- Frontend tests:
  - auth form validation.
  - protected state rendering.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.

### Exit Criteria

- A demo user can register, login, refresh, logout, and call protected APIs.
- New user balances are seeded through ledger entries.
- Auth errors are safe and actionable.
- Auth flow is documented and tested.
- Admin role exists for later admin/dev screens.

### Risk Watch

- Risk: storing refresh tokens unsafely. Mitigation: only hashed refresh tokens are stored.
- Risk: adding auth state directly into unrelated UI. Mitigation: isolate API client and auth store.
- Risk: frontend token handling becoming overbuilt. Mitigation: keep it adequate for local prototype and document assumptions.

## Milestone 4: Market Data Ingestion

Dates: June 15-June 21, 2026

### Primary Goal

Connect to a free public crypto WebSocket provider, normalize market data, store recent ticks/candles, expose provider health, and prepare public realtime fanout.

### Why This Milestone Matters

Live data is one of the project's strongest portfolio signals. It proves the system handles external streaming input, reconnection, normalization, persistence, health reporting, and real-time UI updates.

### Deliverables

- Market data provider interface.
- First provider adapter:
  - Coinbase Advanced Trade WebSocket or Binance public streams.
- Normalized internal `MarketTickReceived` event.
- Support for BTC and ETH pairs.
- Reconnect with exponential backoff and jitter.
- Provider health state:
  - connected/disconnected.
  - last message timestamp.
  - reconnect count.
  - last error summary.
- Tick persistence.
- One-minute candle aggregation.
- Market data REST endpoints:
  - `GET /api/symbols`.
  - `GET /api/market/:symbol/ticks`.
  - `GET /api/market/:symbol/candles`.
- Basic market-data tests using fixture messages.

### Engineering Tasks

- Implement provider abstraction:
  - connect.
  - disconnect.
  - subscribe symbols.
  - parse raw message.
  - expose health.
- Add provider-specific fixture files for tests.
- Normalize symbols to internal format:
  - `BTC-USD` or `BTCUSDT` consistently.
  - map display labels separately if needed.
- Normalize tick fields:
  - symbol.
  - price.
  - size.
  - provider timestamp.
  - received timestamp.
  - provider name.
  - sequence or trade ID where available.
- Implement candle aggregation:
  - open.
  - high.
  - low.
  - close.
  - volume.
  - interval start.
  - interval end.
- Add Redis cache for latest price by symbol.
- Add metrics placeholders:
  - ticks received.
  - provider reconnects.
  - provider errors.
- Add clear startup behavior:
  - API can start without provider if configured.
  - provider errors do not crash the whole app unless explicitly configured.

### Documentation Tasks

- Update `docs/events.md` with market events.
- Update `docs/api.md` with market endpoints.
- Add provider choice ADR if not already written.
- Add troubleshooting section:
  - provider unavailable.
  - symbol subscription fails.
  - rate-limited or disconnected feed.

### Tests And Verification

- Unit tests:
  - provider message parser.
  - symbol normalization.
  - candle aggregation.
  - reconnect state machine if isolated.
- Integration tests:
  - market REST endpoints return seeded or stored data.
  - health endpoint reflects provider state.
- Manual verification:
  - run API.
  - connect to provider.
  - observe logs for ticks.
  - query latest market endpoints.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.

### Exit Criteria

- The backend receives live BTC/ETH market data.
- Provider failures are visible and recoverable.
- Recent ticks and one-minute candles are stored or retrievable.
- Market data contracts are documented.
- Parser and aggregation behavior are covered by tests.

### Risk Watch

- Risk: public provider changes message format. Mitigation: keep fixtures and parser tests updated.
- Risk: provider downtime slows development. Mitigation: support recorded fixture replay mode.
- Risk: data volume overwhelms local database. Mitigation: store bounded recent ticks for prototype and document retention.

## Milestone 5: Realtime Gateway And Market UI

Dates: June 22-June 28, 2026

### Primary Goal

Deliver the first full realtime vertical slice: backend market feed to WebSocket gateway to browser trading dashboard.

### Why This Milestone Matters

This is where the project starts feeling alive. A reviewer should be able to open the UI and immediately see live prices, charts, feed status, and stable realtime behavior.

### Deliverables

- Public WebSocket channel subscriptions:
  - `market.ticks.{symbol}`.
  - `market.candles.{symbol}`.
  - `system.health`.
- WebSocket message envelope:
  - type.
  - channel.
  - payload.
  - timestamp.
  - correlation ID where relevant.
- Heartbeat/ping-pong behavior.
- Client reconnect behavior.
- Frontend trading dashboard:
  - symbol selector.
  - live last price.
  - percent/absolute movement display.
  - basic candlestick or line chart.
  - feed connection status.
  - recent tick list or compact ticker tape.
- Loading, empty, reconnecting, and error states.

### Engineering Tasks

- Build WebSocket subscription manager:
  - connection ID.
  - subscribe.
  - unsubscribe.
  - validate channel names.
  - track connection health.
- Broadcast market ticks from ingestion path to gateway.
- Add backpressure guard:
  - queue size limit per client.
  - disconnect or drop policy for slow clients.
  - structured warning logs.
- Implement frontend WebSocket client:
  - reconnect with backoff.
  - resubscribe after reconnect.
  - parse typed message envelopes.
  - expose status to UI.
- Add frontend market store or query integration:
  - latest prices.
  - candle window.
  - connection health.
- Build responsive dashboard layout.
- Use accessible color treatment for buy/sell/up/down states.

### Documentation Tasks

- Update `docs/events.md` with WebSocket envelope examples.
- Update `docs/api.md` with WebSocket channel list.
- Add local manual test steps:
  - start Docker.
  - start API.
  - start web.
  - open dashboard.
  - verify ticks are moving.

### Tests And Verification

- Backend tests:
  - subscription validation.
  - heartbeat behavior.
  - invalid channel rejection.
  - message envelope shape.
- Frontend tests:
  - market status rendering.
  - symbol selector updates subscription.
  - reconnect state display.
- Manual browser verification:
  - live chart updates.
  - reconnect UI appears when API is stopped.
  - UI recovers when API restarts.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.

### Exit Criteria

- A user can view live BTC/ETH market prices in the browser.
- WebSocket channel behavior is documented and tested.
- Reconnect behavior is visible and stable.
- The market UI is usable on desktop and mobile widths.
- The implementation is ready to accept private trading channels later.

### Risk Watch

- Risk: UI becomes chart-only and misses trading workflow. Mitigation: leave space for order form, order book, open orders, and portfolio panels.
- Risk: WebSocket contracts drift. Mitigation: define message envelopes in shared domain types.
- Risk: tests avoid realtime behavior. Mitigation: test subscription and message handling with controlled fake sockets where possible.

## Milestone 6: Matching Engine Core

Dates: June 29-July 5, 2026

### Primary Goal

Build a deterministic, isolated matching engine that supports limit orders, market orders, price-time priority, partial fills, cancellation, and order book snapshots.

### Why This Milestone Matters

The matching engine is the most important backend signal in the project. It should be small, pure where possible, and easy to test deeply. This is the part reviewers will inspect for engineering maturity.

### Deliverables

- Matching engine module with no direct HTTP or UI coupling.
- In-memory order book per symbol.
- Price-time priority:
  - bids: highest price first, earliest time first.
  - asks: lowest price first, earliest time first.
- Order types:
  - limit.
  - market.
- Order statuses:
  - pending.
  - open.
  - partially filled.
  - filled.
  - cancelled.
  - rejected.
- Match result model:
  - accepted order.
  - generated trades.
  - updated resting orders.
  - rejected reason where applicable.
- Order book snapshot output.
- Deep unit test suite for matching behavior.

### Engineering Tasks

- Define core engine input:
  - order ID.
  - user ID.
  - symbol.
  - side.
  - type.
  - price for limit orders.
  - quantity.
  - timestamp.
- Define core engine output:
  - order updates.
  - trade executions.
  - remaining book changes.
  - snapshot deltas if useful.
- Implement stable sorting without relying on accidental JavaScript object order.
- Avoid floating point errors in price and quantity comparisons.
- Keep engine deterministic:
  - no database calls inside pure matching logic.
  - no wall-clock calls inside matching logic.
  - no random IDs generated by the engine unless injected.
- Implement cancellation:
  - cancel only open or partially filled resting orders.
  - remove from book.
  - return remaining quantity for reserve release.
- Implement book rebuild input:
  - persisted open orders sorted by symbol, side, price, created time.
- Add benchmark scaffold for matching operations.

### Edge Cases To Test

- Buy limit crosses existing ask.
- Sell limit crosses existing bid.
- Buy limit rests when below best ask.
- Sell limit rests when above best bid.
- Market buy fills best asks until quantity is complete or liquidity ends.
- Market sell fills best bids until quantity is complete or liquidity ends.
- Partial fill leaves remainder open for limit order.
- Partial fill cancels remainder for market order if no liquidity remains.
- Equal price orders match earliest created order first.
- Multiple fills across several price levels.
- Cancellation removes only the target order.
- Cancellation of filled order is rejected.
- Cancellation of unknown order is rejected.
- Self-trade policy is explicit and tested.
- Zero, negative, and invalid quantities are rejected before matching.

### Documentation Tasks

- Add `docs/matching-engine.md` with:
  - engine responsibilities.
  - inputs and outputs.
  - matching rules.
  - order status transitions.
  - edge cases.
  - self-trade policy.
- Update `docs/code-review.md` with matching-specific checks.

### Tests And Verification

- Unit tests should cover all edge cases above.
- Add property-style tests if practical:
  - total filled quantity never exceeds submitted quantity.
  - resting book never contains filled orders.
  - bid side sorted correctly.
  - ask side sorted correctly.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - matching benchmark script if added.

### Exit Criteria

- Matching engine behavior is deterministic and well documented.
- Unit tests cover normal and adversarial cases.
- Order book snapshot generation works.
- Engine can rebuild from persisted open orders.
- The module is ready to be wrapped by transactional order placement in Milestone 7.

### Risk Watch

- Risk: mixing persistence with core matching too early. Mitigation: keep pure engine separate from application service.
- Risk: decimal precision mismatch between engine and database. Mitigation: reuse Milestone 2 numeric utilities.
- Risk: hidden self-trade ambiguity. Mitigation: decide and document policy explicitly.

## Milestone 7: Orders, Reserves, And Ledger Settlement

Dates: July 6-July 12, 2026

### Primary Goal

Connect the matching engine to the real API and database with transactional order placement, balance reservation, trade settlement, cancellation, and portfolio views.

### Why This Milestone Matters

This is the core trading system. The project becomes credible only when order acceptance, matching, and ledger settlement are tied together safely in database transactions.

### Deliverables

- REST endpoints:
  - `POST /api/orders`.
  - `GET /api/orders`.
  - `DELETE /api/orders/:orderId`.
  - `GET /api/trades`.
  - `GET /api/portfolio`.
  - `GET /api/orderbook/:symbol`.
- Transactional order placement service.
- Balance reserve logic.
- Trade settlement through append-only ledger entries.
- Cancellation with reserve release.
- Portfolio projection from ledger entries.
- Startup rebuild of in-memory order books from persisted open orders.
- Integration test coverage for order placement and settlement.

### Engineering Tasks

- Validate order request:
  - symbol supported.
  - side valid.
  - type valid.
  - price required for limit orders.
  - price absent or ignored for market orders by explicit policy.
  - quantity valid.
- Implement available balance calculation:
  - cash available.
  - asset available.
  - reserved cash.
  - reserved asset.
- Reserve on accepted order:
  - buy limit reserves quote asset based on price \* quantity.
  - buy market reserve policy is explicit and bounded.
  - sell orders reserve base asset quantity.
- Execute matching within transaction boundary:
  - persist accepted order.
  - persist trades.
  - persist ledger entries.
  - update order statuses.
  - create audit events.
  - create outbox events for durable business changes.
- Implement cancellation:
  - authenticate ownership or admin role.
  - cancel only cancellable order statuses.
  - remove from in-memory book.
  - persist status update.
  - release unused reserves through ledger entries.
  - create audit and outbox events.
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

### Documentation Tasks

- Update `docs/api.md` with orders, trades, portfolio, and order book endpoints.
- Update `docs/data-model.md` with ledger entry examples.
- Add `docs/trading-invariants.md`:
  - no negative balances.
  - reservation rules.
  - settlement rules.
  - cancellation rules.
  - order state transitions.

### Tests And Verification

- Integration tests:
  - place buy limit order with sufficient USD.
  - reject buy order with insufficient USD.
  - place sell order with sufficient asset.
  - reject sell order with insufficient asset.
  - match two users and create trade records.
  - create buyer and seller ledger entries.
  - partial fill leaves open remainder.
  - cancel open order releases reserve.
  - cancel filled order rejected.
  - startup rebuild restores open order book.
  - transaction rollback leaves no partial state.
- Unit tests:
  - balance calculation.
  - order validators.
  - ledger settlement helpers.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.

### Exit Criteria

- Authenticated users can place, view, and cancel paper orders.
- Trades settle through ledger entries.
- Portfolio endpoint reflects balances and reserves.
- Open order book survives restart through rebuild.
- Critical trading invariants are tested.

### Risk Watch

- Risk: reserve logic becoming hard to reason about. Mitigation: document examples and test every state transition.
- Risk: market orders requiring complex slippage controls. Mitigation: implement conservative prototype policy and document it.
- Risk: transaction boundaries being split accidentally. Mitigation: use one application service for order placement orchestration.

## Milestone 8: Realtime Private Trading Flow

Dates: July 13-July 19, 2026

### Primary Goal

Complete the user-facing realtime trading loop: order updates, trade updates, portfolio updates, order book broadcasts, and a frontend trading workspace that reacts instantly to backend state changes.

### Why This Milestone Matters

The platform should feel like a trading system rather than a set of REST endpoints. Milestone 8 proves the backend and frontend can coordinate private and public realtime state safely.

### Deliverables

- Private WebSocket authentication.
- Private channels:
  - `user.orders`.
  - `user.trades`.
  - `user.portfolio`.
- Public trading channels:
  - `orderbook.{symbol}`.
  - `market.ticks.{symbol}`.
  - `market.candles.{symbol}`.
- Redis-backed fanout for gateway coordination.
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
- Optimistic or near-realtime UI policy documented.

### Engineering Tasks

- Authenticate WebSocket private subscriptions:
  - token handshake or auth message.
  - reject private channels without valid JWT.
  - scope private updates to the authenticated user only.
- Publish order/trade/portfolio events after successful transaction commit.
- Add Redis pub/sub or streams fanout:
  - API publishes event.
  - WebSocket gateway receives event.
  - gateway forwards only to subscribed connections.
- Add message filtering:
  - user ID matching for private events.
  - symbol matching for public events.
- Add frontend API mutations:
  - place order.
  - cancel order.
  - refresh open orders.
- Add frontend realtime reconciliation:
  - REST initial load.
  - WebSocket incremental updates.
  - refetch on reconnect.
  - handle duplicate events idempotently.
- Add UI states:
  - insufficient balance.
  - order rejected.
  - order partially filled.
  - cancelled.
  - reconnecting.
  - stale market data.

### Documentation Tasks

- Update `docs/events.md` with private event payloads.
- Update `docs/api.md` with WebSocket auth flow.
- Add frontend workflow notes:
  - initial data load.
  - realtime updates.
  - reconnect/refetch strategy.

### Tests And Verification

- Backend tests:
  - private subscription without token rejected.
  - private subscription with invalid token rejected.
  - user receives own order update.
  - user does not receive another user's private update.
  - duplicate event does not create duplicate UI-facing update if server handles idempotency.
- Frontend tests:
  - order form validation.
  - order placement success updates open orders.
  - order rejection renders actionable message.
  - WebSocket order update changes status.
  - reconnect triggers refetch.
- Manual verification:
  - two demo users trading against each other.
  - order book updates in browser.
  - portfolio changes after fill.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.

### Exit Criteria

- A user can complete the full browser workflow: login, view market, place order, see order update, see trade, see portfolio change.
- Private WebSocket data is scoped to the correct user.
- Public order book updates are visible in real time.
- Reconnect behavior does not leave UI permanently stale.

### Risk Watch

- Risk: duplicate events causing incorrect UI state. Mitigation: include event IDs and idempotent reducers.
- Risk: leaking private events. Mitigation: test user scoping explicitly.
- Risk: UI complexity exploding. Mitigation: keep components feature-based and reuse shared formatters.

## Milestone 9: Event Streaming And Workers

Dates: July 20-July 26, 2026

### Primary Goal

Turn durable state changes into reliable events using the outbox pattern, Redpanda topics, idempotent workers, retry handling, and dead-letter diagnostics.

### Why This Milestone Matters

Event-driven architecture is a major enterprise signal only if it is reliable. Publishing directly after database writes is not enough. Milestone 9 makes event delivery intentional and inspectable.

### Deliverables

- Outbox event writer integrated into business transactions.
- Worker process or worker module to publish outbox events to Redpanda.
- Redpanda topics:
  - `market.ticks`.
  - `market.candles`.
  - `orders.events`.
  - `trades.events`.
  - `ledger.events`.
  - `portfolio.events`.
  - `audit.events`.
  - `dead-letter.events`.
- Idempotent event publishing.
- Retry with backoff.
- Dead-letter handling after maximum attempts.
- Worker health endpoint or status surface.
- Event docs with schemas and versioning rules.

### Engineering Tasks

- Define outbox event states:
  - pending.
  - publishing.
  - published.
  - failed.
  - dead-lettered.
- Implement poller:
  - batch pending events.
  - mark as publishing safely.
  - publish to topic.
  - mark as published.
  - increment attempts on failure.
  - dead-letter after threshold.
- Add idempotency:
  - event IDs stable.
  - publisher handles retry safely.
  - consumers track processed event IDs where needed.
- Add worker lifecycle:
  - start.
  - stop.
  - graceful shutdown.
  - health.
- Add consumer examples:
  - portfolio projection if useful.
  - audit stream processor if useful.
  - WebSocket fanout consumer if not already covered by Redis.
- Add topic creation instructions to local startup.
- Add correlation IDs from API requests to outbox events.

### Documentation Tasks

- Fill `docs/events.md` with:
  - topic names.
  - event envelope.
  - payload versioning.
  - retry and dead-letter behavior.
  - idempotency expectations.
- Update architecture docs with outbox worker flow.
- Add troubleshooting notes:
  - Redpanda not available.
  - outbox stuck pending.
  - dead-letter inspection.

### Tests And Verification

- Unit tests:
  - outbox state transitions.
  - retry decision logic.
  - topic routing.
  - event envelope validation.
- Integration tests:
  - order transaction writes outbox events.
  - worker publishes pending event.
  - failed publish increments attempts.
  - repeated failures dead-letter event.
  - successful retry marks published once.
- Manual verification:
  - create order.
  - inspect outbox row.
  - run worker.
  - inspect published status and Redpanda topic.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.

### Exit Criteria

- Critical business changes are written to outbox inside the same transaction as database state.
- Worker can publish events reliably to Redpanda.
- Failures are retried and eventually diagnosable.
- Event contracts are documented.
- Correlation IDs are present across request, outbox, logs, and emitted event.

### Risk Watch

- Risk: spending too much time on full stream processing. Mitigation: focus on reliable outbox and one or two meaningful consumers.
- Risk: local Redpanda startup complexity. Mitigation: runbook must explain setup and diagnostics.
- Risk: hidden event schema drift. Mitigation: centralize event definitions in shared package.

## Milestone 10: Admin, Audit, And Product Depth

Dates: July 27-August 2, 2026

### Primary Goal

Add admin/dev visibility, immutable audit trails, trade history, richer frontend workflows, and operational screens that make the project feel complete and reviewable.

### Why This Milestone Matters

Enterprise systems are not only happy-path user flows. They also expose enough administrative and diagnostic visibility to understand what happened, when, and why.

### Deliverables

- Admin/dev API endpoints:
  - `GET /api/admin/health`.
  - `GET /api/admin/audit-events`.
  - `GET /api/admin/users`.
  - `GET /api/admin/orders`.
  - `GET /api/admin/trades`.
  - optional `GET /api/admin/outbox`.
- Role-protected admin access.
- Immutable audit events for:
  - auth events.
  - order submission.
  - order rejection.
  - order cancellation.
  - trade creation.
  - ledger entry creation.
  - admin access.
- Frontend admin/dev screen:
  - service health.
  - provider health.
  - event throughput summary.
  - recent errors.
  - links to Grafana, Prometheus, and Jaeger.
- User-facing trade history and order history.
- Improved empty states and error states.

### Engineering Tasks

- Implement audit event writer:
  - actor user ID.
  - actor role.
  - event type.
  - target entity.
  - metadata.
  - correlation ID.
  - timestamp.
- Ensure audit events are append-only by convention and tests.
- Add admin authorization middleware:
  - require authenticated user.
  - require admin role.
  - return safe errors.
- Add query pagination:
  - audit events.
  - admin orders.
  - admin trades.
  - user order history.
  - user trade history.
- Add frontend admin route or tab.
- Add frontend tables with:
  - stable columns.
  - loading state.
  - empty state.
  - error state.
  - pagination or sensible limits.
- Add user account menu:
  - current user.
  - logout.
  - role indicator only if useful.

### Documentation Tasks

- Update `docs/api.md` with admin endpoints.
- Update `docs/data-model.md` with audit event examples.
- Add `docs/runbooks/admin-debugging.md`:
  - how to inspect order failure.
  - how to trace correlation ID.
  - how to inspect dead-letter events.

### Tests And Verification

- Backend tests:
  - user cannot access admin endpoints.
  - admin can access admin endpoints.
  - audit event created for order placement.
  - audit event created for cancellation.
  - audit events are returned newest-first.
  - pagination works.
- Frontend tests:
  - admin tab hidden or blocked for non-admin.
  - admin screen renders health state.
  - trade history renders filled trades.
  - order history renders terminal and active statuses.
- Manual verification:
  - place order.
  - cancel order.
  - inspect audit trail.
  - verify admin screen shows relevant state.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.

### Exit Criteria

- Admin/dev visibility explains current platform health.
- Audit trail can answer who did what and when.
- User history views make trading activity inspectable.
- Admin authorization is tested.
- UI workflows feel coherent beyond the initial trading form.

### Risk Watch

- Risk: admin screen becoming a dumping ground. Mitigation: organize by health, events, users, trading, and observability.
- Risk: audit logs storing sensitive data. Mitigation: whitelist metadata fields and test secret redaction.
- Risk: pagination deferred too long. Mitigation: add simple limit/cursor or limit/offset now.

## Milestone 11: Observability

Dates: August 3-August 9, 2026

### Primary Goal

Instrument the platform with structured logs, OpenTelemetry traces, Prometheus metrics, Grafana dashboards, and documented observability workflows.

### Why This Milestone Matters

Strong observability separates a toy project from a production-style system. Reviewers should see that you can operate, debug, and measure the system, not just write feature code.

### Deliverables

- Structured JSON logs with:
  - timestamp.
  - level.
  - service name.
  - message.
  - request ID.
  - correlation ID.
  - user ID where safe.
  - route or operation.
- OpenTelemetry tracing for:
  - HTTP requests.
  - auth flow.
  - order placement.
  - matching.
  - trade settlement.
  - outbox publish.
  - market data ingest.
  - WebSocket broadcast.
- Prometheus metrics:
  - HTTP request count, duration, and status.
  - active WebSocket connections.
  - WebSocket messages sent.
  - market ticks received.
  - provider reconnect count.
  - orders accepted and rejected.
  - trades created.
  - order placement latency.
  - matching latency.
  - outbox publish lag.
  - database operation latency if practical.
  - Redis operation latency if practical.
- Grafana dashboards:
  - API overview.
  - trading overview.
  - market data overview.
  - WebSocket overview.
  - outbox/worker overview.
- Jaeger trace examples.
- Observability screenshots saved under docs or assets if tracked later.

### Engineering Tasks

- Add telemetry module:
  - tracer provider.
  - meter provider.
  - logger correlation binding.
  - graceful shutdown.
- Add request middleware:
  - request ID.
  - correlation ID.
  - request duration.
  - safe error logging.
- Add span attributes carefully:
  - route.
  - symbol.
  - order side/type.
  - order status.
  - event type.
  - never include secrets or tokens.
- Add metrics endpoint if needed.
- Configure OpenTelemetry Collector in Docker Compose.
- Configure Prometheus scrape targets.
- Build Grafana dashboards as JSON or documented local setup.
- Add runbook for tracing a failed order by correlation ID.

### Documentation Tasks

- Add `docs/observability.md`:
  - metrics list.
  - traces list.
  - logs format.
  - dashboards.
  - common debugging workflows.
- Update README with observability startup commands and links.
- Add screenshots or placeholders with instructions for regeneration.

### Tests And Verification

- Unit tests:
  - correlation ID propagation helpers.
  - metric label generation where isolated.
  - safe log redaction.
- Integration tests:
  - API responses include or propagate correlation ID.
  - errors include correlation ID.
  - metrics endpoint exposes expected metric names.
- Manual verification:
  - place an order.
  - find logs by correlation ID.
  - find trace in Jaeger.
  - see order/trade metrics in Prometheus/Grafana.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.

### Exit Criteria

- A failed or successful order can be traced from API request to database transaction to outbox event to WebSocket update.
- Dashboards show useful local system health.
- Metrics names and trace coverage are documented.
- Logs are structured and safe.

### Risk Watch

- Risk: observability code spreading everywhere. Mitigation: centralize helpers and instrument at boundaries.
- Risk: high-cardinality metric labels. Mitigation: avoid user IDs, order IDs, and raw error messages as metric labels.
- Risk: dashboards become manual-only. Mitigation: store JSON dashboards where possible.

## Milestone 12: Performance And Reliability

Dates: August 10-August 16, 2026

### Primary Goal

Measure and harden the system under realistic local prototype pressure: order placement load, WebSocket fanout, market data bursts, provider reconnects, slow clients, and worker failure recovery.

### Why This Milestone Matters

Performance claims without measurement are weak. Milestone 12 creates evidence and improves the system where measurements expose bottlenecks.

### Deliverables

- k6 load tests:
  - auth/login baseline if useful.
  - order placement.
  - portfolio reads.
  - WebSocket subscriptions if practical.
- Matching engine benchmark results.
- WebSocket fanout benchmark or stress script.
- Market data fixture replay mode for burst testing.
- Backpressure behavior documented and tested.
- Reliability drills:
  - provider disconnect.
  - Redis restart.
  - Redpanda unavailable.
  - database transaction failure.
  - worker crash/restart.
- `docs/benchmarks.md` filled with measured results.

### Engineering Tasks

- Add `test:load` script if not already present.
- Add k6 scripts under `tests/load` or `apps/api/test/load`.
- Define local benchmark environment:
  - machine assumptions.
  - Docker resources.
  - service versions.
  - dataset size.
- Measure:
  - API p95 latency for normal REST reads.
  - order placement p95 under small local load.
  - WebSocket market tick fanout latency.
  - matching engine throughput.
  - outbox publish lag.
- Add protective limits:
  - request body size.
  - WebSocket message queue size.
  - max subscriptions per connection.
  - rate limits for order placement.
- Improve slow paths discovered by measurement:
  - missing indexes.
  - inefficient portfolio queries.
  - excessive event payloads.
  - chatty frontend refetching.
- Add graceful shutdown:
  - stop accepting new requests.
  - close WebSocket connections.
  - finish or cancel worker batch safely.

### Documentation Tasks

- Fill `docs/benchmarks.md` with:
  - commands.
  - hardware/local environment.
  - test scenarios.
  - results.
  - bottlenecks.
  - follow-up items.
- Add `docs/runbooks/reliability-drills.md`:
  - how to simulate failures.
  - expected behavior.
  - how to verify recovery.

### Tests And Verification

- Automated tests:
  - rate limit behavior.
  - slow WebSocket client handling if testable.
  - worker retry on Redpanda failure using mocks or local integration.
  - database rollback still preserves invariants.
- Manual/load tests:
  - run k6 order placement.
  - run WebSocket fanout script.
  - restart provider connection or simulate disconnect.
  - stop Redis and observe behavior.
  - restart worker and verify pending outbox drains.
- Run:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.
  - `npm run test:load` if implemented.

### Exit Criteria

- Performance targets are either met or transparently documented with next steps.
- Reliability drills have expected behavior and recovery notes.
- Backpressure and rate limits are implemented.
- Benchmark docs provide credible evidence for portfolio review.

### Risk Watch

- Risk: chasing unrealistic production performance. Mitigation: local prototype targets are enough; focus on correctness and evidence.
- Risk: load tests becoming flaky. Mitigation: use stable seed data and document environment assumptions.
- Risk: over-optimizing before measuring. Mitigation: measure first, optimize only identified bottlenecks.

## Milestone 13: Security, Accessibility, And Correctness Hardening

Dates: August 17-August 23, 2026

### Primary Goal

Run a hardening pass across security, authorization, input validation, accessibility, error handling, edge cases, and trading invariants.

### Why This Milestone Matters

Most portfolio projects fail under edge cases. Milestone 13 deliberately attacks the system to find leaks, invalid states, weak permissions, confusing errors, and inaccessible UI interactions.

### Deliverables

- Lightweight threat model.
- Security checklist completed.
- Accessibility checklist completed.
- Expanded invariant tests.
- Error response consistency audit.
- Frontend loading/empty/error/reconnect states verified.
- Dependency audit documented.
- Test coverage improvements for critical paths.

### Engineering Tasks

- Security review:
  - all private REST routes require auth.
  - admin routes require admin role.
  - private WebSocket channels require auth.
  - users cannot access other users' orders, trades, portfolio, or private events.
  - CORS locked to allowed local origins.
  - JWT secrets validated at startup.
  - refresh tokens stored hashed.
  - passwords never logged.
  - request validation on all external inputs.
  - rate limits on auth, order placement, and WebSocket connection attempts.
- Trading correctness review:
  - no negative balances.
  - reserve math under partial fills.
  - cancellation releases exactly unused reserve.
  - market order behavior under insufficient liquidity.
  - restart rebuild consistency.
  - duplicate event handling.
  - transaction rollback behavior.
- Accessibility review:
  - keyboard navigation.
  - focus states.
  - input labels.
  - table semantics.
  - chart alternatives or summaries.
  - color is not the only status indicator.
  - responsive layout.
- Error handling review:
  - consistent response envelope.
  - correlation ID on internal errors.
  - validation errors include field details.
  - order rejections are user-actionable.
  - async errors visible in admin/dev tools.

### Documentation Tasks

- Add `docs/security.md`:
  - threat model.
  - assumptions.
  - controls.
  - non-goals.
  - local-only limitations.
- Add `docs/accessibility.md`:
  - checklist.
  - known gaps.
  - verification steps.
- Update `docs/trading-invariants.md` with new edge cases found.

### Tests And Verification

- Add or expand tests:
  - cross-user REST access denied.
  - cross-user WebSocket event leak prevented.
  - admin-only endpoints blocked for normal user.
  - malformed request bodies rejected.
  - invalid symbols rejected.
  - invalid order states rejected.
  - duplicate cancellation behavior.
  - concurrent order placement where practical.
  - ledger entries remain append-only.
  - refresh token replay behavior.
- Run:
  - `npm audit` or document why not used.
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.
- Manual verification:
  - keyboard-only trading workflow.
  - mobile viewport trading workflow.
  - forced backend errors show useful messages.

### Exit Criteria

- Critical permissions are tested.
- Trading invariants have strong coverage.
- UI passes a practical accessibility review.
- Security assumptions are documented.
- Known residual risks are explicit and acceptable for a local paper-trading prototype.

### Risk Watch

- Risk: discovering major correctness bug late. Mitigation: prioritize invariant fixes over UI polish this milestone.
- Risk: accessibility becoming superficial. Mitigation: test keyboard and screen-reader-friendly labels manually.
- Risk: dependency audit noise. Mitigation: document findings and fix high-impact issues first.

## Milestone 14: Developer Experience And Portfolio Packaging

Dates: August 24-August 30, 2026

### Primary Goal

Make the project easy to run, demo, inspect, and understand. Package the engineering story with runbooks, screenshots, architecture diagrams, sample data, and reviewer-focused docs.

### Why This Milestone Matters

A strong project can still fail a review if setup is painful or the story is unclear. Milestone 14 turns the working system into a portfolio-quality artifact.

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

### Engineering Tasks

- Smooth setup:
  - verify `.env.example`.
  - verify Docker Compose health checks.
  - verify migrations and seed script.
  - add script aliases for common tasks.
  - ensure ports are documented.
- Improve developer feedback:
  - clear startup logs.
  - health check summaries.
  - friendly errors for missing env vars.
  - troubleshooting docs linked from README.
- Add demo data:
  - admin user.
  - two normal users.
  - starter balances.
  - optional preloaded historical ticks/candles.
  - optional open orders for visual order book.
- Clean repo:
  - remove obsolete files.
  - ensure generated artifacts are ignored.
  - ensure docs are accurate.
  - ensure comments are useful and not noisy.
- Verify install from a clean clone simulation if practical.

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
- Add `docs/cv-notes.md`:
  - concise project bullets.
  - interview talking points.
  - hardest engineering problems solved.
  - correctness and reliability story.

### Tests And Verification

- Fresh environment verification:
  - remove local containers/volumes if safe.
  - install dependencies.
  - start Docker Compose.
  - migrate and seed.
  - start API and web.
  - complete demo workflow.
- Quality gates:
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.
  - `npm run test:load` if available.
- Visual verification:
  - desktop screenshot.
  - mobile screenshot.
  - dashboard links work.

### Exit Criteria

- A reviewer can run the project with minimal guidance.
- Docs explain both the product and engineering decisions.
- Demo workflow is reliable.
- Screenshots and runbooks support the portfolio story.
- Known limitations are honest and documented.

### Risk Watch

- Risk: docs overclaim features. Mitigation: describe only what works and clearly label future work.
- Risk: setup still depends on hidden local state. Mitigation: test from a clean local setup.
- Risk: screenshots becoming stale. Mitigation: regenerate after final UI changes.

## Milestone 15: Final Stabilization And Launch Package

Dates: August 31-September 6, 2026

### Primary Goal

Stabilize, verify, record, and package the final version so it is ready for GitHub, CV use, portfolio review, and technical interview discussion.

### Why This Milestone Matters

The final milestone is not for major architecture changes. It is for making the project trustworthy: final bug fixes, final tests, clean docs, polished demo, and a clear engineering narrative.

### Deliverables

- Release candidate branch or tag.
- Final full-stack QA pass.
- Final README and docs pass.
- Final screenshots and demo video.
- Final benchmark numbers.
- Final architecture review.
- Final security/correctness checklist.
- CV bullets and interview notes.
- Post-launch backlog for future improvements.

### Engineering Tasks

- Run end-to-end manual demo multiple times:
  - fresh login.
  - market data live.
  - place buy order.
  - place matching sell order.
  - observe fills.
  - cancel open order.
  - inspect portfolio.
  - inspect audit log.
  - inspect metrics/traces.
- Fix final bugs only if they protect core functionality.
- Freeze major scope:
  - no new major features unless required to complete existing flows.
  - no large refactors unless they fix a release-blocking issue.
- Final cleanup:
  - remove dead code.
  - remove unused dependencies.
  - ensure `.env.example` is accurate.
  - ensure Docker Compose services are named clearly.
  - ensure generated artifacts are ignored or intentionally tracked.
- Prepare release notes:
  - features completed.
  - architecture highlights.
  - testing summary.
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
- Finalize `docs/reviewer-guide.md`.
- Finalize `docs/benchmarks.md`.
- Finalize `docs/security.md`.
- Finalize `docs/trading-invariants.md`.
- Finalize `docs/cv-notes.md`.
- Add post-launch roadmap:
  - optional Kubernetes manifests.
  - optional frontend deployment.
  - optional replayable market-data simulator.
  - optional more symbols.
  - optional advanced order types.

### Tests And Verification

- Full quality gates:
  - `npm ci`.
  - `npm run lint`.
  - `npm run typecheck`.
  - `npm run test`.
  - `npm run build`.
  - `npm run test:e2e` if implemented.
  - `npm run test:load` if implemented.
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
- GitHub checks:
  - CI passes.
  - default branch protected if desired.
  - repository description and topics set.
  - screenshots visible.

### Exit Criteria

- The system can be demoed from scratch without hand-waving.
- Core trading workflow works end to end.
- Critical tests and quality gates pass.
- Observability evidence is available.
- README and reviewer docs are accurate.
- CV/interview notes explain the engineering value clearly.

### Risk Watch

- Risk: adding late features destabilizes release. Mitigation: freeze scope and focus on defects.
- Risk: docs drift after final fixes. Mitigation: update docs in the same final pass.
- Risk: demo depends on live provider availability. Mitigation: keep fixture replay or seed fallback ready.

## Workstream Checklist

Use this section as a cross-milestone tracker.

### Backend

- [ ] Database migrations and seed data.
- [ ] Auth and session flow.
- [ ] Rate limiting.
- [ ] Market data ingestion.
- [ ] Candle aggregation.
- [ ] Matching engine.
- [ ] Order placement.
- [ ] Cancellation.
- [ ] Ledger settlement.
- [ ] Portfolio calculation.
- [ ] Audit log.
- [ ] Outbox worker.
- [ ] Redpanda publishing.
- [ ] Redis fanout.
- [ ] Health checks.
- [ ] Metrics and traces.

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
- [ ] Loading, empty, error, reconnect states.
- [ ] Responsive and accessible polish.

### Data And Correctness

- [ ] Numeric precision strategy.
- [ ] Append-only ledger.
- [ ] Reserve and release rules.
- [ ] Trade settlement rules.
- [ ] Order state machine.
- [ ] Startup order book rebuild.
- [ ] Idempotent event handling.
- [ ] Dead-letter handling.
- [ ] Trading invariant tests.

### DevOps And Observability

- [ ] Docker Compose health.
- [ ] PostgreSQL local setup.
- [ ] Redis local setup.
- [ ] Redpanda local setup.
- [ ] Prometheus local setup.
- [ ] Grafana dashboards.
- [ ] Jaeger traces.
- [ ] Structured logs.
- [ ] k6 load tests.
- [ ] CI checks.
- [ ] Runbooks.

### Portfolio Evidence

- [ ] README with screenshots.
- [ ] Architecture diagram.
- [ ] Data model docs.
- [ ] Event model docs.
- [ ] Matching engine docs.
- [ ] Trading invariants docs.
- [ ] Observability docs.
- [ ] Benchmark results.
- [ ] Demo script.
- [ ] CV bullets.
- [ ] Interview talking points.

## Priority Rules

If schedule pressure appears, protect the highest-signal work first.

### P0: Must Have

- Authenticated paper trading.
- Live market data.
- Deterministic matching engine.
- Transactional orders, reserves, trades, and ledger entries.
- Portfolio view.
- Realtime WebSocket updates.
- Trading invariant tests.
- README and local runbook.
- Basic observability.

### P1: Should Have

- Redpanda outbox worker.
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

Avoid these until the core platform is done:

- Real-money trading.
- Exchange custody.
- Payment processing.
- Advanced compliance claims.
- Complex microservice split before module boundaries are stable.
- Multi-region architecture.
- High-frequency trading claims.
- Paid APIs or paid cloud services.
- Large analytics system unrelated to trading correctness.

## Final Review Questions

Before declaring the 15-milestone plan complete, answer these honestly:

- Can a reviewer run the project locally from the README without hidden knowledge?
- Does the trading workflow work end to end from browser to database to realtime updates?
- Can the order book be rebuilt from durable state?
- Are trading invariants tested, especially balances, reserves, fills, and cancellation?
- Can a failed order be traced by correlation ID?
- Are metrics and dashboards useful enough to debug the system?
- Does the frontend handle loading, error, reconnect, empty, and mobile states?
- Are docs accurate and free of exaggerated production claims?
- Are known limitations documented?
- Can the project be explained clearly in a technical interview in under five minutes?
