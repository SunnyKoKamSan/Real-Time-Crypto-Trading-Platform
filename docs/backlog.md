# Engineering Backlog

This backlog turns the 15-milestone roadmap into reviewer-sized tasks. Status values are `todo`,
`doing`, `blocked`, or `done`.

## Milestone 1: Architecture Lock

| ID     | Status | Task                                                                 | Acceptance evidence                                     |
| ------ | ------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| M1-001 | done   | Lock workspace package map for API, web, and domain                  | `package.json`, package manifests, workspace docs       |
| M1-002 | done   | Add TypeScript references from apps to domain                        | `apps/*/tsconfig.json`, `packages/domain/tsconfig.json` |
| M1-003 | done   | Enforce import boundaries with ESLint                                | `.eslintrc.cjs`, `npm run lint`                         |
| M1-004 | done   | Add negative boundary verification fixtures                          | `npm run test:boundaries`                               |
| M1-005 | done   | Standardize JSON response envelopes                                  | API tests assert `meta.correlationId` and timestamp     |
| M1-006 | done   | Add initial ADR set                                                  | `docs/adr/*.md`                                         |
| M1-007 | done   | Lock PostgreSQL, Redis, Redpanda, outbox, Drizzle, precision choices | ADRs 0001, 0002, 0003, 0004, 0006, 0008                 |
| M1-008 | done   | Write local-development and troubleshooting runbooks                 | `docs/runbooks/*.md`                                    |
| M1-009 | done   | Write reviewer code checklist                                        | `docs/code-review.md`                                   |
| M1-010 | todo   | Capture Docker health evidence on the target developer machine       | `docker compose ps` and endpoint check notes            |

## Milestone 2: Database Foundation

| ID     | Status | Task                                                                          | Acceptance evidence                            |
| ------ | ------ | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| M2-001 | todo   | Install and configure Drizzle for PostgreSQL                                  | Drizzle config, npm scripts, passing typecheck |
| M2-002 | todo   | Create initial migration layout                                               | Versioned SQL or generated migration files     |
| M2-003 | todo   | Define users, sessions, symbols, orders, trades, ledger, audit, outbox tables | Migration and schema review                    |
| M2-004 | todo   | Add transaction helper for repositories                                       | Unit tests and API integration smoke test      |
| M2-005 | todo   | Seed supported symbols and demo paper balances                                | Repeatable seed command                        |
| M2-006 | todo   | Add database connection health check                                          | `/api/system/info` or admin health evidence    |

## Milestone 3: Auth And Sessions

| ID     | Status | Task                                               | Acceptance evidence                                  |
| ------ | ------ | -------------------------------------------------- | ---------------------------------------------------- |
| M3-001 | todo   | Implement registration schema and password hashing | Zod validation and repository tests                  |
| M3-002 | todo   | Implement login, refresh, and logout flows         | Supertest coverage                                   |
| M3-003 | todo   | Add auth rate limits and safe error responses      | Integration tests and code-review checklist evidence |
| M3-004 | todo   | Protect private API routes                         | 401/403 tests                                        |

## Milestone 4: Market Data

| ID     | Status | Task                                                         | Acceptance evidence                             |
| ------ | ------ | ------------------------------------------------------------ | ----------------------------------------------- |
| M4-001 | done   | Build provider adapter contract                              | Unit tests with fixture provider messages       |
| M4-002 | done   | Normalize BTC/ETH ticks to decimal strings                   | Schema tests                                    |
| M4-003 | done   | Persist market ticks and candles                             | Integration tests with mocked provider input    |
| M4-004 | done   | Report provider reconnect and health status                  | Logs and admin health output                    |
| M4-005 | done   | Add Coinbase live adapter and deterministic fixture replay   | `apps/api/src/market-data/*`, fixture JSONL     |
| M4-006 | done   | Add bounded queue, parser, reconnect, and candle unit tests  | `apps/api/test/market-data/*.test.ts`           |
| M4-007 | done   | Add market REST endpoints and DB-backed integration coverage | `/api/market/health`, ticks, candles tests      |
| M4-008 | done   | Document provider, contracts, runbook, and data model        | API/events/data-model/runbook docs and ADR 0009 |

## Milestones 5-15

| Milestone | Status | Reviewer-sized themes                                                                  |
| --------- | ------ | -------------------------------------------------------------------------------------- |
| M5        | todo   | Public WebSocket channels, reconnect UX, live chart data, fixture-to-live transition   |
| M6        | todo   | Deterministic matching engine, price-time priority, adjacent unit tests, benchmarks    |
| M7        | todo   | Order placement, reserves, settlement ledger, cancellation release logic               |
| M8        | todo   | Private WebSocket updates for orders, trades, balances, and portfolio projections      |
| M9        | todo   | Outbox publisher, Redpanda topics, idempotent consumers, dead-letter diagnostics       |
| M10       | todo   | Admin/dev console, audit-event browsing, trade history, operational controls           |
| M11       | todo   | OpenTelemetry traces, Prometheus metrics, Grafana dashboards, Jaeger trace walkthrough |
| M12       | todo   | k6 load tests, WebSocket fanout tests, recovery drills, benchmark evidence             |
| M13       | todo   | Threat model, permission checks, accessibility pass, invariant hardening               |
| M14       | todo   | Demo data, screenshots, runbook hardening, one-command local flow                      |
| M15       | todo   | Release candidate QA, final demo script, portfolio packaging                           |
