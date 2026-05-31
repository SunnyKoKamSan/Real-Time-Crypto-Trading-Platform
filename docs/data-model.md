# Data Model

PostgreSQL is the durable source of truth. Redis, streams, WebSocket payloads, and future in-memory books are derived from these tables and can be rebuilt.

## Ownership

- Auth owns `users` and `sessions`.
- Market data owns `symbols`, `market_ticks`, and `candles`.
- Orders owns order state transitions.
- Matching owns deterministic match results, not persistence policy.
- Ledger owns balance-affecting append-only entries.
- Outbox owns durable publish state and `processed_events` consumer idempotency tracking.
- Audit owns immutable reviewer/operator history.

## Versioned Data Layout Rules

- Schema changes live in ordered Drizzle migration files.
- Migration files are append-only after review. Fix forward with a new migration instead of editing a migration that has been merged.
- Every table has an explicit owner module documented in this file.
- Every durable business table has `created_at`; mutable tables also have `updated_at`.
- API and event payload versions are independent from database migration versions and must be documented in `docs/api.md` or `docs/events.md`.
- Redis key layouts are versioned with a prefix such as `rtctp:v1:*` because Redis is derived state and may be rebuilt after layout changes.

## Tables

| Table              | Purpose                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `users`            | Platform accounts. Email is unique.                                                             |
| `sessions`         | Token hashes linked to users. Session token hash is unique and sessions cascade delete with user. |
| `symbols`          | Tradable markets such as `BTC-USD` and `ETH-USD`. Symbol code is unique; base and quote assets differ. |
| `orders`           | Durable user order intent and fill state. Side/type/status are PostgreSQL enums.                 |
| `trades`           | Immutable executions linking buy and sell orders at a positive price and quantity.               |
| `ledger_entries`   | Append-only signed accounting rows for balance, reserve, release, settlement, and fee events.    |
| `market_ticks`     | Raw market prices by symbol and observed timestamp.                                              |
| `candles`          | OHLCV bars by symbol, interval, and timestamp. `(symbol_id, interval, timestamp)` is unique.     |
| `audit_events`     | Typed event records with JSON payload and metadata.                                              |
| `outbox_events`    | Event metadata and payload inserted in the same transaction as state changes.                    |
| `processed_events` | Consumer idempotency table keyed by `(consumer_group_name, event_id)`.                           |

## Financial Precision

All persisted prices, quantities, balances, reserves, releases, settlement amounts, and fees use `NUMERIC(20, 8)`. Repository boundaries expose these values as strings. Application arithmetic must use `decimal.js`; JavaScript `number` is not accepted by domain financial helpers.

Initial financial column policy:

| Field family                                      | PostgreSQL type  | Notes                                                        |
| ------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| Prices, limit prices, average fill prices         | `NUMERIC(20, 8)` | Nullable only when the order type is `MARKET`.               |
| Order quantity, filled quantity, remaining amount | `NUMERIC(20, 8)` | Must be non-negative; accepted order quantity must be `> 0`. |
| Balances, reserves, releases, settlement amounts  | `NUMERIC(20, 8)` | Updated only through append-only ledger entries.             |
| Fees                                              | `NUMERIC(20, 8)` | Zero-fee prototype still stores explicit fee values.         |

This decision is recorded in [ADR 0008](adr/0008-financial-precision.md). If the project later switches to scaled `BIGINT` storage, that must be captured in a replacement ADR and applied consistently across database schema, domain math, API strings, events, and tests.

## Constraints

- `users.email` is unique.
- `symbols.code` is unique.
- Orders enforce valid side/type/status through enums.
- Order quantity must be positive.
- Filled and remaining quantities must be non-negative.
- Filled quantity cannot exceed total quantity.
- Limit orders require a positive price.
- Market orders persist `NULL` price.
- Trade quantity and price must be positive.
- Ledger entry `amount` is signed and cannot be zero.
- Outbox status is an enum; payload version must be positive; attempts cannot be negative.

## Indexes

Book rebuild:

- `orders_open_buy_book_idx` on `(symbol_id, price DESC, created_at ASC, id ASC)` for open buy limit orders.
- `orders_open_sell_book_idx` on `(symbol_id, price ASC, created_at ASC, id ASC)` for open sell limit orders.

High-volume query paths:

- `orders_user_status_created_idx`
- `trades_symbol_created_idx`
- `ledger_entries_user_asset_created_idx`
- `outbox_events_status_created_idx`
- `market_ticks_symbol_timestamp_idx`
- `candles_symbol_interval_timestamp_idx`
- `processed_events_consumer_group_event_idx`

## Invariants To Preserve

- No accepted order without reserve handling.
- No negative cash or asset balance.
- No trade without corresponding ledger entries.
- No filled order remains open.
- No cancellation without release of unused reserves.
- No mutation of historical ledger entries.
- Redis and in-memory books can be rebuilt from PostgreSQL.

## Ledger Reconstruction Example

Balances are derived, not updated in place:

```sql
select user_id, asset, coalesce(sum(amount), 0)::numeric(20, 8) as balance
from ledger_entries
group by user_id, asset;
```

For a user with:

- `SYSTEM_MINT USD +100000.00000000`
- `ORDER_RESERVE USD -25000.00000000`
- `ORDER_RELEASE USD +5000.00000000`
- `TRADE_SETTLEMENT BTC +0.50000000`
- `FEE USD -10.00000000`

the reconstructed balances are `USD 79990.00000000` and `BTC 0.50000000`.
