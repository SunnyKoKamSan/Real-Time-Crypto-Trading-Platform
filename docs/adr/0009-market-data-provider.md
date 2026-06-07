# ADR 0009: Market Data Provider And Ingestion Mode

Date: 2026-06-07

Status: accepted

## Context

Milestone 4 needs deterministic market data ingestion for `BTC-USD` and `ETH-USD` without adding
exchange credentials or real-money trading responsibilities. The backend also needs a fixture path
so parser, queue, candle, endpoint, and health behavior can be tested without internet access.

## Decision

Use Coinbase Advanced Trade public WebSocket as the first live provider and keep deterministic JSONL
fixture replay as a first-class ingestion mode.

Implemented modes:

- `disabled`: API starts without provider work and reports disabled health.
- `fixture`: API replays local Coinbase-shaped JSONL messages.
- `live`: API connects to Coinbase at `wss://advanced-trade-ws.coinbase.com`.

The live adapter subscribes to `heartbeats` and `market_trades`. The normalized domain event is
`MarketTickReceived` with decimal string `price` and `size`, provider timestamps, API received
timestamps, provider sequence, and optional trade ID.

## Consequences

- No Coinbase API key is required for public market trades.
- Provider callbacks stay lightweight: parse, classify, and enqueue only.
- PostgreSQL ticks and candles are the source for REST reads.
- Redis latest-price keys are derived state and can fail without stopping ingestion.
- Queue capacity is bounded and uses `drop_oldest`.
- Binance remains a documented fallback, not an implemented provider in Milestone 4.

## Limits

- Only `BTC-USD` and `ETH-USD` are accepted by domain validation.
- Only one-minute candles are exposed.
- Browser WebSocket fanout and live chart updates remain Milestone 5.
- Redpanda publication of market events remains Milestone 9.
