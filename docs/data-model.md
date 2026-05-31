# Data Model

## Week 1 Status

No database schema has been implemented yet. Week 2 will add Drizzle, migrations, repositories, seed
data, and transaction helpers.

## Planned Tables

| Table            | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `users`          | User account and role metadata.                                |
| `sessions`       | Hashed refresh tokens or session records.                      |
| `symbols`        | Tradable paper-market symbols.                                 |
| `orders`         | Durable order state and execution metadata.                    |
| `trades`         | Matched executions between buy and sell orders.                |
| `ledger_entries` | Append-only balance, reserve, release, and settlement records. |
| `market_ticks`   | Recent normalized provider ticks.                              |
| `candles`        | Aggregated OHLCV candles.                                      |
| `audit_events`   | Immutable security and trading audit records.                  |
| `outbox_events`  | Durable business events pending publish.                       |

## Versioned Data Layout Rules

- Schema changes live in ordered migration files under the future Drizzle migration directory.
- Migration filenames must include a monotonically increasing version and a short intent, for
  example `0001_create_users.sql`.
- Migrations are append-only after review. Fix forward with a new migration instead of editing a
  migration that has been merged.
- Every table has an explicit owner module documented in this file.
- Every durable business table has `created_at`; mutable tables also have `updated_at`.
- API and event payload versions are independent from database migration versions and must be
  documented in `docs/api.md` or `docs/events.md`.
- Redis key layouts are versioned with a prefix such as `rtctp:v1:*` because Redis is derived state
  and may be rebuilt after layout changes.

## Financial Precision Strategy

PostgreSQL is the source of truth for all financial values. JavaScript `number` must not be used for
money, price, quantity, fee, reserve, or balance arithmetic.

- Persist externally visible financial values as PostgreSQL `NUMERIC(20, 8)` unless a later symbol
  requires a documented wider scale.
- Use Drizzle `numeric` columns as strings at repository boundaries.
- Convert decimal strings to an arbitrary-precision decimal type in domain/application code before
  arithmetic. The initial implementation should use `decimal.js` or an equivalent exact decimal
  library.
- Serialize API and event financial values as strings, not JSON numbers.
- Keep raw market timestamps, counters, and sequence numbers as integer types. Do not mix them with
  financial decimal fields.

Initial financial column policy:

| Field family                                      | PostgreSQL type  | Notes                                                        |
| ------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| Prices, limit prices, average fill prices         | `NUMERIC(20, 8)` | Nullable only when the order type is `market`.               |
| Order quantity, filled quantity, remaining amount | `NUMERIC(20, 8)` | Must be non-negative; accepted order quantity must be `> 0`. |
| Balances, reserves, releases, settlement amounts  | `NUMERIC(20, 8)` | Updated only through append-only ledger entries.             |
| Fees                                              | `NUMERIC(20, 8)` | Zero-fee prototype still stores explicit fee values.         |

Representative constraints:

```sql
CHECK (quantity > 0),
CHECK (filled_quantity >= 0),
CHECK (filled_quantity <= quantity),
CHECK (
  (order_type = 'limit' AND price IS NOT NULL AND price > 0) OR
  (order_type = 'market' AND price IS NULL)
)
```

This decision is recorded in [ADR 0008](adr/0008-financial-precision.md). If the project later
switches to scaled `BIGINT` storage, that must be captured in a replacement ADR and applied
consistently across database schema, domain math, API strings, events, and tests. Mixing scaled
integers and decimal columns for the same financial concept is not allowed.

## Indexing Strategy

The matching engine must be able to hydrate open books from PostgreSQL without scanning historical
orders. Buy and sell books need different price ordering, so use side-specific partial indexes rather
than one generic `price ASC` index.

```sql
CREATE INDEX idx_orders_open_buy_matching
  ON orders (symbol, price DESC, created_at ASC, id ASC)
  WHERE side = 'buy' AND status IN ('open', 'partially_filled');

CREATE INDEX idx_orders_open_sell_matching
  ON orders (symbol, price ASC, created_at ASC, id ASC)
  WHERE side = 'sell' AND status IN ('open', 'partially_filled');
```

Additional planned indexes:

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC, id DESC);

CREATE INDEX idx_trades_symbol_created
  ON trades (symbol, created_at DESC, id DESC);

CREATE INDEX idx_ledger_entries_user_created
  ON ledger_entries (user_id, created_at DESC, id DESC);

CREATE UNIQUE INDEX idx_outbox_events_id
  ON outbox_events (id);
```

## Invariants To Preserve

- No accepted order without reserve handling.
- No negative cash or asset balance.
- No trade without corresponding ledger entries.
- No filled order remains open.
- No cancellation without release of unused reserves.
- No mutation of historical ledger entries.
- Redis and in-memory books can be rebuilt from PostgreSQL.

## Ownership

- Auth owns `users` and `sessions`.
- Market data owns `symbols`, `market_ticks`, and `candles`.
- Orders owns order state transitions.
- Matching owns deterministic match results, not persistence policy.
- Ledger owns balance-affecting append-only entries.
- Outbox owns durable publish state.
- Audit owns immutable reviewer/operator history.
