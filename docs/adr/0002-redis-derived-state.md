# ADR 0002: Redis Is For Derived And Short-Lived State

## Status

Accepted.

## Context

The app needs fast fanout, rate limiting, cache, and eventually coordination between API, worker, and
WebSocket paths. Redis is not appropriate as the source of truth for money-like ledger state.

## Decision

Use Redis for cache, rate limits, pub/sub or streams, and derived market/order-book snapshots.

## Consequences

- Redis state must be safe to delete and rebuild.
- No critical balance, order, trade, or ledger mutation is complete because it reached Redis.
- WebSocket fanout can use Redis, but durable business events still go through PostgreSQL and
  Redpanda.
