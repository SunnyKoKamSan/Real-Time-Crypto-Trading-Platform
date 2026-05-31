# ADR 0008: Financial Precision

## Status

Accepted.

## Context

Trading state cannot rely on binary floating point. Prices, quantities, balances, reserves, releases, settlements, and fees need stable decimal representation in storage, APIs, events, tests, and documentation.

## Decision

- PostgreSQL stores financial values as `NUMERIC(20, 8)`.
- Drizzle repositories expose financial database values as strings.
- API and event payloads serialize financial values as strings.
- Domain arithmetic uses `decimal.js`.
- Domain boundary helpers reject JavaScript `number` for financial values.
- Ledger rows use signed `amount` values and typed `LedgerEntryType` values, so direction and reason are explicit.

## Consequences

Application code must parse financial strings into `Decimal` before arithmetic and format results back to strings before persistence or serialization. Schema constraints reject invalid order/trade/ledger states even if an application bug reaches the database.
