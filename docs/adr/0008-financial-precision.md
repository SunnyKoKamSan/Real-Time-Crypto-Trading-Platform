# ADR 0008: Use Exact Decimal Financial Values

## Status

Accepted.

## Context

The platform handles paper-trading prices, quantities, reserves, balances, fees, and ledger entries.
JavaScript floating-point arithmetic is not acceptable for these values because it can introduce
rounding errors in matching, reserve checks, settlement, and audit trails.

Two viable strategies were considered:

- Store all financial values as scaled `BIGINT` values.
- Store externally visible financial values as PostgreSQL `NUMERIC(20, 8)` and use an exact decimal
  library in application code.

## Decision

Use PostgreSQL `NUMERIC(20, 8)` for financial persistence and use an exact decimal library such as
`decimal.js` in application/domain code. Drizzle repository boundaries expose decimal values as
strings. API responses and event payloads also serialize financial values as strings, never JSON
numbers.

## Consequences

- PostgreSQL remains readable and auditable for reviewers inspecting balances, orders, trades, and
  ledger entries.
- Domain code must reject JavaScript `number` for financial arithmetic.
- Tests must cover decimal parsing, rounding policy, reserve calculations, partial fills, and ledger
  settlement.
- A future switch to scaled `BIGINT` must be handled as a schema-wide migration, not mixed into
  individual tables opportunistically.
