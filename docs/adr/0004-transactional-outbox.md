# ADR 0004: Durable Business Events Use The Outbox Pattern

## Status

Accepted.

## Context

Trading state changes must not commit to the database while related events are lost before publish.
Directly publishing to Redpanda inside a request transaction would couple request success to broker
availability.

## Decision

Write durable business events to an `outbox_events` table in the same PostgreSQL transaction as the
business change. A worker publishes them to Redpanda and marks delivery state.

## Consequences

- Order, trade, ledger, portfolio, and audit events require stable IDs and correlation IDs.
- Outbox workers need retry and dead-letter behavior.
- API requests can commit durable state even when broker publishing is temporarily unavailable.
- Observability must include outbox lag and failed publish counts.
