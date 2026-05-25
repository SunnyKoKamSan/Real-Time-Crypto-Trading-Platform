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
