# ADR 0003: Redpanda Provides Kafka-Compatible Local Event Streaming

## Status

Accepted.

## Context

The project should demonstrate event-driven architecture without requiring paid services or complex
local infrastructure. Kafka-compatible tooling is a strong reviewer signal, but ZooKeeper-heavy local
setup would add friction.

## Decision

Use Redpanda as the local Kafka-compatible broker.

## Consequences

- Event topics should use stable names documented in `docs/events.md`.
- Consumers must be idempotent.
- Dead-letter handling is required before async workers are treated as production-style.
- Redpanda is local infrastructure only; the app must still run basic API/web checks without it.
