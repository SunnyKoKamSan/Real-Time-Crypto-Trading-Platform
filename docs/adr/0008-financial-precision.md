# ADR 0008: Use Exact Decimal Financial Values

## Status

Accepted.

## Context

The platform handles paper-trading prices, quantities, reserves, balances, fees, ledger entries, and settlement amounts. JavaScript floating-point arithmetic is not acceptable for these values because it can introduce rounding errors in matching, reserve checks, settlement, persistence, event payloads, and audit trails.

Two viable strategies were considered:

- Store all financial values as scaled `BIGINT` values.
- Store externally visible financial values as PostgreSQL `NUMERIC(20, 8)` and use an exact decimal library in application code.

## Decision

Use PostgreSQL `NUMERIC(20, 8)` for financial persistence and use `decimal.js` in application/domain code. Drizzle repository boundaries expose decimal values as strings. API responses and event payloads also serialize financial values as strings, never JSON numbers.

Domain boundary helpers reject JavaScript `number` for financial values. Ledger rows use signed `amount` values and typed `LedgerEntryType` values, so direction and reason are explicit. The database enforces that `SYSTEM_MINT` and `ORDER_RELEASE` are positive, `ORDER_RESERVE` and `FEE` are negative, and `TRADE_SETTLEMENT` remains signed by the asset-side effect.

## Consequences

- PostgreSQL remains readable and auditable for reviewers inspecting balances, orders, trades, and ledger entries.
- Application code must parse financial strings into `Decimal` before arithmetic and format results back to strings before persistence or serialization.
- Domain code must reject JavaScript `number` for financial arithmetic.
- Tests must cover decimal parsing, rounding policy, reserve calculations, partial fills, and ledger settlement.
- Schema constraints reject invalid order/trade/ledger states even if an application bug reaches the database.
- A future switch to scaled `BIGINT` must be handled as a schema-wide migration, not mixed into individual tables opportunistically.
