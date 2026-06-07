# Event Contract

## Event Envelope

Durable business events should use this shape before being written to the outbox.

```json
{
  "id": "event-id",
  "type": "OrderAccepted",
  "version": 1,
  "aggregateType": "order",
  "aggregateId": "order-id",
  "correlationId": "request-or-system-correlation-id",
  "occurredAt": "2026-05-25T00:00:00.000000000Z",
  "payload": {}
}
```

## Initial Event Types

- `MarketTickReceived`
- `CandleUpdated`
- `OrderRequested`
- `OrderAccepted`
- `OrderRejected`
- `OrderCancelled`
- `OrderMatched`
- `TradeCreated`
- `LedgerEntryCreated`
- `PortfolioUpdated`
- `AuditEventCreated`

## Initial Topics

| Topic                | Producer                    | Consumer                                   | Partition key                |
| -------------------- | --------------------------- | ------------------------------------------ | ---------------------------- |
| `market.ticks`       | Market-data ingestor        | WebSocket gateway, candle worker           | `symbol`                     |
| `market.candles`     | Candle worker               | WebSocket gateway, API projections         | `symbol`                     |
| `orders.events`      | Orders module               | WebSocket gateway, audit/projector workers | `userId`                     |
| `trades.events`      | Matching/settlement modules | Portfolio and audit workers                | `symbol`                     |
| `ledger.events`      | Ledger module               | Portfolio projections, audit workers       | `userId`                     |
| `portfolio.events`   | Portfolio projector         | WebSocket gateway                          | `userId`                     |
| `audit.events`       | API and trading modules     | Admin views                                | `userId` or `aggregateId`    |
| `dead-letter.events` | Workers                     | Admin diagnostics                          | Original event partition key |

Partitioning rules:

- Ordering is guaranteed only within a single topic partition.
- Market tick and candle topics are keyed by `symbol` so all `BTC-USD` updates are processed in
  sequence.
- Order, ledger, and portfolio topics are keyed by `userId` so one user's financial state is not
  processed concurrently out of order.
- Trade events are keyed by `symbol` to preserve market execution order. Per-user balance ordering is
  enforced by the downstream `ledger.events` stream.
- Dead-letter events preserve the original event ID, topic, partition, offset, key, error class, and
  retry count.

## Rules

- Events representing durable business changes are written through the outbox first.
- Consumers must be idempotent.
- Event payloads are versioned.
- Events never contain passwords, tokens, or secrets.
- Order, trade, and ledger events must include correlation IDs.
- Financial values in event payloads are decimal strings, never JSON numbers.
- Event timestamps use UTC ISO-8601 strings with nine fractional digits.

## Market Events

Milestone 4 defines the normalized tick event at the domain boundary. It is not yet published to
Redpanda by the API process; the contract is ready for the Milestone 9 outbox/streaming work.

```json
{
  "type": "MarketTickReceived",
  "version": 1,
  "symbol": "BTC-USD",
  "price": "65000.12000000",
  "size": "0.01000000",
  "providerTimestamp": "2026-06-07T00:00:01.000Z",
  "receivedTimestamp": "2026-06-07T00:00:01.100Z",
  "provider": "coinbase",
  "providerSequence": "10",
  "tradeId": "12345"
}
```

Partition key: `symbol`.

Notes:

- `providerTimestamp` is the exchange trade time.
- `receivedTimestamp` is set by the API process when the raw provider message is parsed.
- `tradeId` is used for dedupe when the provider supplies one.
- `price` and `size` are decimal strings validated by the shared domain schema.

## Idempotency Mechanics

Every durable consumer must record processed event IDs in PostgreSQL inside the same transaction as
its side effects.

```sql
CREATE TABLE processed_events (
  consumer_group_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_group_name, event_id)
);
```

Consumer flow:

1. Start a database transaction.
2. Insert `(consumer_group_name, event_id)` into `processed_events`.
3. If the insert conflicts, skip side effects and acknowledge the message.
4. Apply side effects and commit.
5. Acknowledge the message only after commit succeeds.
