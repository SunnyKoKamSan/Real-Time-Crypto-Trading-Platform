# Data Model

PostgreSQL is the durable source of truth. Redis, streams, WebSocket payloads, and future in-memory books are derived from these tables and can be rebuilt.

## Ownership

- `users`, `sessions`: identity/auth ownership.
- `symbols`, `market_ticks`, `candles`: market data ownership.
- `orders`, `trades`: matching and execution ownership.
- `ledger_entries`: balance source of truth. Balances are reconstructed by summing signed ledger amounts by `(user_id, asset)`.
- `audit_events`: immutable operational audit trail.
- `outbox_events`, `processed_events`: transactional event publication and idempotent consumer tracking.

## Tables

- `users`: platform accounts. Email is unique.
- `sessions`: token hashes linked to users. Session token hash is unique and sessions cascade delete with the user.
- `symbols`: tradable markets such as `BTC-USD` and `ETH-USD`. Symbol code is unique; base and quote assets must differ.
- `orders`: user order intent and fill state. Side/type/status are PostgreSQL enums. Financial fields use `NUMERIC(20, 8)`.
- `trades`: immutable executions linking buy and sell orders at a positive price and quantity.
- `ledger_entries`: append-only signed accounting rows. `SYSTEM_MINT` seeds paper balances; later reserves, releases, settlements, and fees are represented as signed entries.
- `market_ticks`: raw market prices by symbol and observed timestamp.
- `candles`: OHLCV bars by symbol, interval, and timestamp. `(symbol_id, interval, timestamp)` is unique.
- `audit_events`: typed event records with JSON payload and metadata.
- `outbox_events`: event metadata and payload inserted in the same transaction as state changes.
- `processed_events`: consumer idempotency table keyed by `(consumer_group_name, event_id)`.

## Financial Precision

All persisted prices, quantities, balances, reserves, releases, settlement amounts, and fees use `NUMERIC(20, 8)`. Repository boundaries expose these values as strings. Application arithmetic must use `decimal.js`; JavaScript `number` is not accepted by domain financial helpers.

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

- Book rebuild:
  - `orders_open_buy_book_idx` on `(symbol_id, price DESC, created_at ASC, id ASC)` for open buy limit orders.
  - `orders_open_sell_book_idx` on `(symbol_id, price ASC, created_at ASC, id ASC)` for open sell limit orders.
- High-volume query paths:
  - `orders_user_status_created_idx`
  - `trades_symbol_created_idx`
  - `ledger_entries_user_asset_created_idx`
  - `outbox_events_status_created_idx`
  - `market_ticks_symbol_timestamp_idx`
  - `candles_symbol_interval_timestamp_idx`
  - `processed_events_consumer_group_event_idx`

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
