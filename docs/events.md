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
  "occurredAt": "2026-05-25T00:00:00.000Z",
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

| Topic                | Producer                    | Consumer                                   |
| -------------------- | --------------------------- | ------------------------------------------ |
| `market.ticks`       | Market-data ingestor        | WebSocket gateway, candle worker           |
| `market.candles`     | Candle worker               | WebSocket gateway, API projections         |
| `orders.events`      | Orders module               | WebSocket gateway, audit/projector workers |
| `trades.events`      | Matching/settlement modules | Portfolio and audit workers                |
| `ledger.events`      | Ledger module               | Portfolio projections, audit workers       |
| `portfolio.events`   | Portfolio projector         | WebSocket gateway                          |
| `audit.events`       | API and trading modules     | Admin views                                |
| `dead-letter.events` | Workers                     | Admin diagnostics                          |

## Rules

- Events representing durable business changes are written through the outbox first.
- Consumers must be idempotent.
- Event payloads are versioned.
- Events never contain passwords, tokens, or secrets.
- Order, trade, and ledger events must include correlation IDs.
