# ADR 0001: PostgreSQL Is The Source Of Truth

## Status

Accepted.

## Context

The platform needs durable, auditable state for users, balances, orders, trades, ledger entries,
audit events, and outbox events. Redis and in-memory order books are useful for speed, but they must
be rebuildable.

## Decision

PostgreSQL is the system of record for all critical business state.

## Consequences

- Order acceptance, reserve movement, trade settlement, ledger creation, and outbox writes must
  happen in explicit database transactions.
- Redis, WebSocket snapshots, and in-memory books are derived state.
- Startup recovery must rebuild open books from PostgreSQL.
- Tests must assert trading invariants against durable state, not only in-memory behavior.
