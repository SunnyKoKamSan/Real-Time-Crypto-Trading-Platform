# ADR 0007: Start As One Process With Modular Entry Points

## Status

Accepted.

## Context

The target architecture includes REST API, WebSocket gateway, market-data ingestor, matching engine,
and outbox worker. Splitting services too early would slow local development and increase wiring
before the core domain exists.

## Decision

Run the API and WebSocket gateway in one process initially. Keep ingestor and worker code behind
separate modules and future entry points so they can be split later without changing domain
contracts.

## Consequences

- `apps/api/src/index.ts` can bootstrap the initial HTTP and WebSocket server.
- Module boundaries must remain clean: controllers should not own matching, ledger, or worker logic.
- Future entry points can be added under `apps/api/src/entrypoints` or separate apps when operational
  pressure justifies it.
