# Milestone 4: Market Data Ingestion Plan

Dates: June 15-June 21, 2026

Status: planned

Primary branch: `feature/market-data-ingestion`

## Planning Inputs

This plan uses:

- `karpathy-guidelines`: keep the implementation small, testable, explicit, and verifiable.
- `ui-ux-pro-max`: keep market data health, degraded states, and future dashboard surfaces aligned with the existing operational trading console design system.
- Current project architecture and docs:
  - `ARCHITECTURE.md`
  - `docs/plan.md`
  - `docs/api.md`
  - `docs/events.md`
  - `docs/data-model.md`
  - `design-system/real-time-crypto-trading-platform/MASTER.md`

## Primary Goal

Connect the backend to deterministic market data sources:

- Live public WebSocket data for `BTC-USD` and `ETH-USD`.
- Fixture replay for repeatable parser, aggregator, endpoint, and load tests.
- Bounded ingestion memory.
- Recent tick and one-minute candle retrieval through REST.
- Provider health visible to developers, reviewers, and future UI/admin surfaces.

The milestone is complete only when live provider failures are visible, recoverable, and testable
without relying on the live provider.

## Current Repository Alignment

Existing assets to reuse:

- `packages/domain/src/index.ts`
  - `SUPPORTED_SYMBOLS`
  - `tradingSymbolSchema`
  - decimal string helpers
  - API envelope types
- `apps/api/src/db/schema.ts`
  - `symbols`
  - `market_ticks`
  - `candles`
- `apps/api/src/repositories/market-data.ts`
  - `insertMarketTick`
  - `listMarketTicksSince`
  - `upsertCandle`
- `apps/api/src/repositories/symbols.ts`
  - `findSymbolByCode`
  - `listSymbols`
  - `upsertSymbol`
- `apps/api/src/redis/client.ts`
  - Redis connection pattern
- `apps/api/src/app.ts`
  - existing `/api/symbols`
  - envelope middleware
  - health and error conventions
- `apps/api/test/*`
  - Supertest integration pattern
- `docs/api.md`, `docs/events.md`, `docs/runbooks/troubleshooting.md`
  - contract docs that must be updated as part of Milestone 4

Important constraint: do not move large parts of the API into the future `modules/*` layout during
this milestone. Add a focused `apps/api/src/market-data/*` module and leave broad structural
refactors for a separate change.

## Extraordinary Upgrade Bar

Milestone 4 should be more than "it connects to a socket." The reviewer-grade bar is:

- A local reviewer can run fixture replay with no internet and get deterministic ticks, candles,
  API responses, logs, and provider health.
- A local reviewer can enable live mode and see provider status transition through
  `connecting`, `connected`, `reconnecting`, `disconnected`, and `degraded`.
- Every high-volume structure has a documented cap and drop policy.
- Parser and candle behavior are independent from the live provider and are covered by fixtures.
- The future frontend/admin UI can consume a stable health payload without guessing internal state.
- The system is honest about prototype limits: retention caps, late-tick policy, provider caveats,
  and local stress-test numbers are documented.

## Provider Decision

Recommended primary provider: Coinbase Advanced Trade public WebSocket.

Why:

- The project uses `BTC-USD` and `ETH-USD`, which match Coinbase product IDs directly.
- Public market data channels do not require JWTs for the target data.
- The `market_trades` channel emits trade arrays, preserving price, size, product ID, trade ID, and
  provider timestamps suitable for one-minute candle aggregation.
- The `heartbeats` channel gives a simple liveness signal and helps keep sparse subscriptions open.

Provider references checked on June 7, 2026:

- Coinbase Advanced Trade WebSocket setup:
  `https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/websocket`
- Coinbase Advanced Trade WebSocket channels:
  `https://docs.cdp.coinbase.com/coinbase-business/advanced-trade-apis/websocket/websocket-channels`
- Binance Spot WebSocket streams, as fallback reference:
  `https://raw.githubusercontent.com/binance/binance-spot-api-docs/master/web-socket-streams.md`

Fallback position:

- Keep the provider abstraction capable of supporting Binance later.
- Do not implement Binance in Milestone 4 unless Coinbase is blocked.
- If Coinbase blocks development, switch live adapter to Binance public `@trade` streams and map
  `BTCUSDT`/`ETHUSDT` to internal `BTC-USD`/`ETH-USD` only for the prototype, with a clear doc note
  that quote asset is provider USDT while internal demo markets are USD.

## Non-Goals

Milestone 4 does not include:

- Authenticated exchange user channels.
- External order routing.
- Real-money trading, deposits, withdrawals, or custody.
- Full order-book reconstruction.
- Browser WebSocket fanout to clients. That is Milestone 5.
- Matching engine price decisions. That starts in Milestone 6.
- Full Redpanda worker ecosystem. Market event contracts are defined now; broader streaming
  operationalization belongs to Milestone 9.
- Complex analytics or historical market data import.

## Target Architecture

```txt
Coinbase WebSocket or fixture file
  -> provider adapter
  -> lightweight parse and normalize
  -> bounded ingestion queue
  -> async ingestion worker
  -> tick repository
  -> latest-price Redis cache
  -> one-minute candle aggregator
  -> candle repository
  -> provider health snapshot
  -> REST endpoints
```

Rules:

- Raw socket callback does only JSON parse, provider message classification, and queue enqueue.
- Persistence, Redis writes, candle aggregation, and logs happen outside the socket callback.
- No unbounded arrays of raw provider messages.
- All financial values stay decimal strings at API, event, Redis, repository, and test fixture
  boundaries.
- JavaScript `number` may be used for durations, counters, and queue lengths only.

## Configuration Plan

Add environment variables in `apps/api/src/config/env.ts`:

| Variable                                  | Default                                                           | Purpose                           |
| ----------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| `MARKET_DATA_MODE`                        | `fixture` in test, `disabled` otherwise unless explicitly set     | `disabled`, `fixture`, or `live`  |
| `MARKET_DATA_PROVIDER`                    | `coinbase`                                                        | Provider adapter selector         |
| `MARKET_DATA_SYMBOLS`                     | `BTC-USD,ETH-USD`                                                 | Comma-separated supported symbols |
| `MARKET_DATA_FIXTURE_PATH`                | `apps/api/test/fixtures/market-data/coinbase-market-trades.jsonl` | Replay source                     |
| `MARKET_DATA_REPLAY_SPEED`                | `1`                                                               | Fixture speed multiplier          |
| `MARKET_DATA_QUEUE_CAPACITY`              | `5000`                                                            | Bounded queue size                |
| `MARKET_DATA_TICK_RETENTION_PER_SYMBOL`   | `10000`                                                           | Prototype API/read cap            |
| `MARKET_DATA_CANDLE_RETENTION_PER_SYMBOL` | `1440`                                                            | One day of one-minute candles     |
| `MARKET_DATA_RECONNECT_BASE_MS`           | `250`                                                             | Initial backoff                   |
| `MARKET_DATA_RECONNECT_MAX_MS`            | `30000`                                                           | Backoff ceiling                   |
| `MARKET_DATA_RECONNECT_JITTER_RATIO`      | `0.2`                                                             | Deterministic jitter range        |
| `MARKET_DATA_HEALTH_STALE_MS`             | `15000`                                                           | Threshold for degraded health     |

Startup behavior:

- `disabled`: API starts, market endpoints return empty data, health reports degraded disabled state.
- `fixture`: API starts replay from fixture with deterministic timing. Tests may run replay manually
  without long-lived background timers.
- `live`: API starts Coinbase provider. If connection fails, API still starts and health reports
  reconnecting or disconnected.

## Domain Contracts

Extend `packages/domain/src/index.ts` with market DTOs and schemas.

### `MarketTickReceived`

```ts
export const marketTickReceivedSchema = z.object({
  type: z.literal('MarketTickReceived'),
  version: z.literal(1),
  symbol: tradingSymbolSchema,
  price: decimalStringSchema,
  size: decimalStringSchema,
  providerTimestamp: z.string().datetime(),
  receivedTimestamp: z.string().datetime(),
  provider: z.enum(['coinbase', 'binance', 'fixture']),
  providerSequence: z.string().optional(),
  tradeId: z.string().optional(),
});
```

Notes:

- `providerSequence` is the provider envelope sequence when present.
- `tradeId` is preferred for duplicate detection when provider supplies one.
- Decimal strings must preserve provider precision, then pass the existing financial decimal policy.
- `providerTimestamp` comes from the exchange trade time.
- `receivedTimestamp` is set by the API process when the raw message is received.

### REST DTOs

Add schemas for:

- `MarketSymbolResponse`
- `MarketTickDto`
- `MarketCandleDto`
- `MarketProviderHealthDto`
- cursor-page metadata used by ticks and candles

Keep DTOs shared in `@rtctp/domain`; keep repository row mapping in `apps/api`.

## API Contracts

### `GET /api/symbols`

Upgrade existing route to source from the `symbols` table when the database is available.

Response:

```json
{
  "symbols": [
    {
      "symbol": "BTC-USD",
      "baseAsset": "BTC",
      "quoteAsset": "USD",
      "priceScale": 8,
      "quantityScale": 8,
      "isActive": true
    }
  ]
}
```

Fallback:

- If database is unavailable during early local development, return `SUPPORTED_SYMBOLS` with
  `degraded: true` only if this is consistent with the existing health behavior.
- Prefer integration tests against the database-backed path.

### `GET /api/market/:symbol/ticks`

Query:

- `limit`: default `50`, max `500`
- `cursor`: opaque, optional
- `since`: ISO timestamp, optional for manual debugging

Sort:

- Newest first by `(observed_at desc, id desc)`.

Response item:

```json
{
  "id": "uuid",
  "symbol": "BTC-USD",
  "price": "65000.12000000",
  "size": "0.00250000",
  "provider": "coinbase",
  "providerTimestamp": "2026-06-15T12:00:00.000000000Z",
  "receivedTimestamp": "2026-06-15T12:00:00.010000000Z",
  "tradeId": "123456789"
}
```

Implementation note:

- Existing `market_ticks` has `price`, `bid`, `ask`, `source`, `observed_at`, and `received_at`, but
  no `size`, `provider_sequence`, or `trade_id`.
- Add a migration to include:
  - `size NUMERIC(20, 8) NOT NULL DEFAULT 0`
  - `provider_sequence VARCHAR(128)`
  - `trade_id VARCHAR(128)`
  - optional unique index on `(symbol_id, source, trade_id)` where `trade_id is not null`

### `GET /api/market/:symbol/candles`

Query:

- `interval`: default `1m`; only `1m` in Milestone 4
- `limit`: default `120`, max `500`
- `cursor`: opaque, optional

Sort:

- Newest first by `(timestamp desc, id desc)`.

Response item:

```json
{
  "id": "uuid",
  "symbol": "BTC-USD",
  "interval": "1m",
  "intervalStart": "2026-06-15T12:00:00.000000000Z",
  "intervalEnd": "2026-06-15T12:01:00.000000000Z",
  "open": "65000.00000000",
  "high": "65010.00000000",
  "low": "64990.00000000",
  "close": "65005.00000000",
  "volume": "1.25000000"
}
```

Implementation note:

- Existing `candles` table stores `timestamp` but not `interval_end`.
- Compute `intervalEnd` in API mapping as `intervalStart + 60 seconds`.
- Keep table shape unless implementation proves an explicit `interval_end` column is needed.

### Provider Health Endpoint

The deliverables mention provider health, but do not name the route. Add a small endpoint:

- `GET /api/market/health`

Response:

```json
{
  "provider": "coinbase",
  "mode": "live",
  "state": "connected",
  "connected": true,
  "lastMessageAt": "2026-06-15T12:00:00.000000000Z",
  "lastTickAt": "2026-06-15T12:00:00.000000000Z",
  "reconnectCount": 2,
  "lastErrorSummary": null,
  "queue": {
    "capacity": 5000,
    "size": 12,
    "dropped": 0,
    "overflowPolicy": "drop_oldest"
  },
  "processed": {
    "rawMessages": 1000,
    "ticks": 1234,
    "duplicates": 3,
    "lateTicks": 2,
    "parserErrors": 1
  }
}
```

Reason:

- Future Milestone 5 UI and Milestone 10 admin/dev console need a stable contract.
- `/health` should remain a coarse service probe.
- `/api/market/health` can be product-specific and detailed.

## Provider Abstraction

Create `apps/api/src/market-data/provider.ts`.

```ts
export interface MarketDataProvider {
  readonly name: MarketDataProviderName;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: TradingSymbol[]): Promise<void>;
  parseRawMessage(raw: string, receivedAt: string): ParseResult;
  getHealth(): MarketProviderHealth;
}
```

Supporting types:

- `MarketDataProviderName = 'coinbase' | 'binance' | 'fixture'`
- `ProviderConnectionState = 'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'degraded'`
- `ParseResult`
  - `{ kind: 'ticks'; ticks: MarketTickReceived[] }`
  - `{ kind: 'heartbeat'; providerSequence?: string }`
  - `{ kind: 'subscription_ack'; symbols: TradingSymbol[] }`
  - `{ kind: 'ignore' }`
  - `{ kind: 'error'; summary: string }`

Design rule:

- Provider parser returns normalized data and classification only.
- Provider parser does not write to DB, Redis, logs, or candle state.

## Coinbase Adapter Plan

Create `apps/api/src/market-data/providers/coinbase.ts`.

Connection:

- URL: `wss://advanced-trade-ws.coinbase.com`
- On open:
  - subscribe to `heartbeats`
  - subscribe to `market_trades` for `BTC-USD` and `ETH-USD`
- Subscription messages are sent immediately after connect.

Parsing:

- Accept `market_trades` messages with one or more trades.
- Map provider `product_id` to internal symbol.
- Preserve:
  - `price`
  - `size`
  - trade timestamp
  - provider envelope timestamp
  - `sequence_num`
  - trade ID if supplied
- Ignore unsupported products.
- Count unsupported products separately from parser errors.
- Treat malformed JSON, missing price, missing size, unsupported symbol, invalid decimal strings,
  and invalid timestamp as parser failures.

Heartbeat:

- Update `lastMessageAt`.
- Capture provider heartbeat counter where available.

Duplicate policy:

- If `tradeId` is present, dedupe on `(provider, symbol, tradeId)`.
- If only provider sequence is present, do not dedupe whole sequences because Coinbase trade updates
  may contain multiple trades.
- If neither exists, accept the tick and rely on fixture/parser tests to make this explicit.

## Reconnect State Machine

Create `apps/api/src/market-data/reconnect.ts`.

States:

- `idle`
- `connecting`
- `connected`
- `backing_off`
- `stopped`

Events:

- `start`
- `connected`
- `message`
- `close`
- `error`
- `manual_stop`
- `timer_elapsed`

Backoff:

- Delay is `min(maxMs, baseMs * 2 ** attempt)`.
- Jitter is deterministic in tests through injected random source.
- Jitter range: `delay +/- delay * jitterRatio`.
- Reset attempt counter after a stable connected window, for example 30 seconds.
- Cap reconnect attempts only if production config later requires it. For local development, keep
  trying and expose reconnect count.

Testing:

- Use fake timers.
- Inject deterministic random values.
- Assert exact delay ranges and state transitions.

## Bounded Queue Plan

Create `apps/api/src/market-data/bounded-queue.ts`.

Policy:

- Capacity default: `5000`.
- Overflow policy: `drop_oldest`.
- Reason: newest ticks are more valuable for a live paper trading prototype and provider health
  should reveal the loss.
- On overflow:
  - increment `dropped`.
  - increment `backlogDrops`.
  - log a structured warning at a throttled interval.
  - keep queue length at capacity.

Queue item:

```ts
interface IngestionQueueItem {
  tick: MarketTickReceived;
  enqueuedAt: string;
}
```

Performance rule:

- `enqueue` must be O(1).
- No array `shift()` on large arrays.
- Use a fixed-size ring buffer or head/tail index queue.

Tests:

- capacity zero is rejected by config validation.
- exact FIFO behavior before overflow.
- exact drop counts after overflow.
- no queue length exceeds capacity.
- newest item remains available after overflow.

## Ingestion Worker

Create `apps/api/src/market-data/ingestor.ts`.

Responsibilities:

- Pull ticks from bounded queue in batches.
- Persist ticks.
- Update Redis latest price.
- Update in-memory candle aggregator.
- Upsert changed candles.
- Update provider health counters.
- Emit structured logs.

Batching:

- Process up to `250` ticks per turn.
- Yield back to event loop between batches with `setImmediate` or equivalent.
- Keep a per-tick processing duration histogram locally in tests or logs.

Failure behavior:

- Tick insert fails:
  - count persistence error.
  - capture safe error summary.
  - keep provider connected if possible.
- Redis write fails:
  - count Redis cache error.
  - continue DB/candle path.
  - API still works from PostgreSQL.
- Candle upsert fails:
  - count aggregator/persistence error.
  - do not crash API.

## Redis Latest Price Cache

Key layout:

- `rtctp:v1:market:latest:BTC-USD`
- `rtctp:v1:market:latest:ETH-USD`

Value:

```json
{
  "symbol": "BTC-USD",
  "price": "65000.12000000",
  "size": "0.00250000",
  "provider": "coinbase",
  "providerTimestamp": "2026-06-15T12:00:00.000000000Z",
  "receivedTimestamp": "2026-06-15T12:00:00.010000000Z",
  "tradeId": "123456789"
}
```

TTL:

- No TTL for latest price in prototype, because stale state is represented by provider health.
- Future UI must display stale status if `lastTickAt` exceeds the stale threshold.

## Candle Aggregation Plan

Create `apps/api/src/market-data/candles.ts`.

Interval:

- Only `1m` in Milestone 4.
- Use UTC minute boundaries based on `providerTimestamp`, not `receivedTimestamp`.

OHLCV:

- `open`: first accepted tick price in interval.
- `high`: max price.
- `low`: min price.
- `close`: latest accepted tick price by provider timestamp, with deterministic tie-breaker.
- `volume`: sum of tick `size`.

Decimal math:

- Use `decimal.js` for high/low comparisons and volume summing.
- Return and persist strings.

Late tick policy:

- Accept late ticks if their interval is still within the in-memory candle window.
- Default in-memory candle window: current interval plus the previous 2 intervals per symbol.
- If a tick is older than the retained candle window:
  - do not mutate the candle.
  - increment `lateTicks`.
  - log at debug level, not warning, unless late rate is high.

Duplicate policy:

- If `(provider, symbol, tradeId)` has already been seen in the dedupe window, ignore tick.
- Increment `duplicates`.
- Do not mutate volume or close.

Close tie-breaker:

- If two ticks have the same `providerTimestamp`, use ingestion order.
- Document that provider order is trusted inside one raw provider message.

Persistence:

- Upsert the current candle on every batch when it changed.
- Do not write on every tick if many ticks update the same candle in a batch.
- Store `timestamp` as interval start.

Tests:

- first tick creates open/high/low/close/volume.
- increasing price updates high and close.
- decreasing price updates low and close.
- duplicate trade ID does not change volume.
- late accepted tick mutates historical retained candle correctly.
- too-late tick increments counter and does not mutate stored candle.
- boundary tick at exactly `12:01:00.000Z` belongs to `12:01`, not `12:00`.

## Fixture Replay Plan

Create fixtures:

- `apps/api/test/fixtures/market-data/coinbase-market-trades.jsonl`
- `apps/api/test/fixtures/market-data/burst-market-trades.jsonl`
- `apps/api/test/fixtures/market-data/malformed-market-trades.jsonl`

Format:

- JSON Lines.
- Each line contains:
  - `atMs`: deterministic replay offset from start.
  - `raw`: provider raw message as object or string.

Example:

```json
{
  "atMs": 0,
  "raw": {
    "channel": "market_trades",
    "timestamp": "2026-06-15T12:00:00.000000000Z",
    "sequence_num": 1,
    "events": [
      {
        "type": "update",
        "trades": [
          {
            "product_id": "BTC-USD",
            "trade_id": "1",
            "price": "65000.00000000",
            "size": "0.10000000",
            "time": "2026-06-15T12:00:00.000000000Z"
          }
        ]
      }
    ]
  }
}
```

Replay modes:

- Parser tests: feed raw lines directly into parser.
- Aggregator tests: use normalized ticks derived from fixture.
- Integration tests: run fixture provider against API app with database.
- Stress tests: replay burst fixture without live WebSocket.

Determinism:

- Inject clock.
- Inject random source for reconnect jitter.
- Avoid `Date.now()` inside parser and aggregator logic.
- Use fixed fixture timestamps.

## Persistence And Retention

Database migration:

- Add `size`, `provider_sequence`, and `trade_id` to `market_ticks`.
- Add useful query index if current index is insufficient:
  - `(symbol_id, observed_at desc, id desc)`
- Add dedupe index:
  - unique `(symbol_id, source, trade_id)` where `trade_id is not null`

Prototype retention:

- Implement code-level read limits in Milestone 4.
- Document default retention caps.
- Do not add destructive cleanup job unless needed to pass stress tests.
- If stress tests reveal database growth issues, add a simple configurable pruning step after batch
  persistence:
  - keep newest `MARKET_DATA_TICK_RETENTION_PER_SYMBOL` rows per symbol.
  - keep newest `MARKET_DATA_CANDLE_RETENTION_PER_SYMBOL` one-minute rows per symbol.

## Logging And Health

Structured log events:

- `market.provider.connecting`
- `market.provider.connected`
- `market.provider.subscription_sent`
- `market.provider.subscription_ack`
- `market.provider.message_parse_failed`
- `market.ingestion.queue_overflow`
- `market.ingestion.batch_processed`
- `market.provider.reconnecting`
- `market.provider.disconnected`
- `market.provider.degraded`

Required log fields:

- `provider`
- `mode`
- `symbols`
- `state`
- `reconnectCount`
- `lastMessageAt`
- `queueSize`
- `queueCapacity`
- `dropped`
- `parserErrors`
- `durationMs` for batch processing

Do not log:

- API secrets.
- Raw provider messages by default.
- Full fixture contents in error logs.

## File-Level Implementation Plan

### Shared Domain

Update:

- `packages/domain/src/index.ts`
  - market tick event schema
  - candle DTO schema
  - market health DTO schema
  - cursor request schemas if shared

Tests:

- `packages/domain/src/index.test.ts`
  - decimal strings accepted and numbers rejected
  - market symbol validation
  - event schema rejects unsupported providers and unsupported symbols

### API Market Module

Add:

- `apps/api/src/market-data/types.ts`
- `apps/api/src/market-data/provider.ts`
- `apps/api/src/market-data/providers/coinbase.ts`
- `apps/api/src/market-data/providers/fixture.ts`
- `apps/api/src/market-data/reconnect.ts`
- `apps/api/src/market-data/bounded-queue.ts`
- `apps/api/src/market-data/candles.ts`
- `apps/api/src/market-data/latest-cache.ts`
- `apps/api/src/market-data/ingestor.ts`
- `apps/api/src/market-data/service.ts`
- `apps/api/src/market-data/routes.ts`

Update:

- `apps/api/src/app.ts`
  - mount market routes
  - replace hardcoded symbol route with repository-backed service where appropriate
- `apps/api/src/index.ts`
  - start/stop market service with API lifecycle
- `apps/api/src/config/env.ts`
  - add market config
- `apps/api/src/repositories/market-data.ts`
  - list ticks with cursor
  - list candles with cursor
  - insert tick fields added by migration
  - optional retention helpers
- `apps/api/src/repositories/symbols.ts`
  - active symbol list helper if needed
- `apps/api/src/db/schema.ts`
  - migration-backed columns and indexes

### Tests

Add:

- `apps/api/test/market-data/coinbase-parser.test.ts`
- `apps/api/test/market-data/symbol-normalization.test.ts`
- `apps/api/test/market-data/bounded-queue.test.ts`
- `apps/api/test/market-data/reconnect.test.ts`
- `apps/api/test/market-data/candles.test.ts`
- `apps/api/test/market-data/fixture-replay.test.ts`
- `apps/api/test/integration/market-data-routes.test.ts`
- `apps/api/test/market-data/stress-fixture.test.ts`

Fixture tests must not connect to the internet.

### Docs

Update:

- `docs/events.md`
  - `MarketTickReceived`
  - `CandleUpdated`
  - topic partition keys
  - event payload examples
  - duplicate and late tick policy
- `docs/api.md`
  - `/api/symbols`
  - `/api/market/:symbol/ticks`
  - `/api/market/:symbol/candles`
  - `/api/market/health`
  - pagination and cursor examples
- `docs/data-model.md`
  - new market tick columns
  - retention assumptions
  - candle aggregation policy
- `docs/runbooks/troubleshooting.md`
  - provider unavailable
  - symbol subscription fails
  - rate-limited or disconnected feed
  - fixture replay mode
  - degraded health interpretation
- `docs/backlog.md`
  - expand Milestone 4 tasks into reviewer-sized units

Add:

- `docs/adr/0009-market-data-provider.md`
  - Coinbase as first provider
  - fixture replay as first-class mode
  - Binance fallback note

## Day-By-Day Plan

### Monday, June 15, 2026: Contracts And Skeleton

Deliver:

- Domain market schemas and DTOs.
- Market module file structure.
- Provider interface.
- Fixture provider skeleton.
- Coinbase parser unit tests with checked fixtures.
- ADR draft for provider choice.

Verification:

- `npm -w @rtctp/domain run build`
- targeted domain tests
- targeted Coinbase parser tests

Exit for the day:

- Parser and normalized event contract are stable enough for the rest of the milestone.

### Tuesday, June 16, 2026: Queue, Reconnect, Fixture Replay

Deliver:

- Bounded queue.
- Reconnect state machine.
- Deterministic fixture replay.
- Health state object with counters.

Verification:

- queue overflow unit tests.
- reconnect fake-timer tests.
- fixture replay deterministic-output tests.

Exit for the day:

- The ingestion system can be tested without live network access.

### Wednesday, June 17, 2026: Persistence, Redis, Candles

Deliver:

- Drizzle migration for tick metadata.
- Repository methods for paged ticks and candles.
- Redis latest price cache.
- One-minute candle aggregator.
- Batch ingestion worker.

Verification:

- candle aggregation unit tests.
- repository integration tests.
- fixture replay produces expected candles.

Exit for the day:

- Fixture ticks are persisted, cached, aggregated, and retrievable locally.

### Thursday, June 18, 2026: Live Coinbase Adapter And API Routes

Deliver:

- Coinbase WebSocket adapter.
- API lifecycle start/stop integration.
- `/api/market/health`
- `/api/market/:symbol/ticks`
- `/api/market/:symbol/candles`
- upgraded `/api/symbols`

Verification:

- Supertest endpoint coverage.
- manual live run if provider is reachable.
- degraded startup check when market mode is disabled or provider connect fails.

Exit for the day:

- Live or fixture market data is visible through REST and health.

### Friday, June 19, 2026: Docs, Stress, Hardening

Deliver:

- Stress fixture test.
- Processing-time measurement under fixture playback.
- Structured logs for provider and queue events.
- Docs updates.
- Backlog update.

Verification:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Exit for the day:

- Milestone is reviewable with passing gates or documented blockers.

### Buffer, June 20-June 21, 2026

Use only for:

- Fixing defects found in quality gates.
- Improving docs clarity.
- Capturing manual verification notes.
- Reducing risky complexity.

Do not add new market features during buffer unless they unblock exit criteria.

## Test Matrix

| Area                 | Test                          | Expected evidence                                                  |
| -------------------- | ----------------------------- | ------------------------------------------------------------------ |
| Provider parser      | Coinbase trade update fixture | normalized ticks preserve symbol, price, size, timestamp, trade ID |
| Provider parser      | heartbeat fixture             | health liveness updates without tick creation                      |
| Provider parser      | malformed JSON                | parser error counter increments, process does not crash            |
| Symbol normalization | `BTC-USD`, `ETH-USD`          | accepted                                                           |
| Symbol normalization | unsupported product           | ignored or rejected as documented                                  |
| Decimal preservation | `"65000.12000000"`            | exact string retained                                              |
| Decimal preservation | numeric `65000.12`            | rejected                                                           |
| Queue                | capacity overflow             | length capped, drop counter exact                                  |
| Reconnect            | close after connect           | state enters backoff, reconnect count increments                   |
| Reconnect            | deterministic jitter          | fake random produces expected delay                                |
| Candles              | normal minute                 | open/high/low/close/volume exact                                   |
| Candles              | duplicate trade               | no volume double count                                             |
| Candles              | late retained tick            | candle mutates as documented                                       |
| Candles              | too-late tick                 | counter increments, candle unchanged                               |
| API                  | ticks endpoint                | paginated envelope, newest first                                   |
| API                  | candles endpoint              | paginated envelope, interval metadata                              |
| API                  | health endpoint               | state, counters, and degraded provider info                        |
| Fixture replay       | deterministic fixture         | exact expected candles                                             |
| Stress               | burst replay                  | no OOM, queue cap honored, drop counters exact                     |

## Manual Verification Script

Run infrastructure:

```bash
npm run infra:up
npm run db:migrate
npm run db:seed
```

Run API in fixture mode:

```bash
MARKET_DATA_MODE=fixture npm run dev:api
```

Check health:

```bash
curl http://localhost:4000/api/market/health
```

Check symbols:

```bash
curl http://localhost:4000/api/symbols
```

Check ticks:

```bash
curl 'http://localhost:4000/api/market/BTC-USD/ticks?limit=10'
```

Check candles:

```bash
curl 'http://localhost:4000/api/market/BTC-USD/candles?interval=1m&limit=10'
```

Run API in live mode:

```bash
MARKET_DATA_MODE=live MARKET_DATA_PROVIDER=coinbase npm run dev:api
```

Observe:

- provider connection logs.
- subscription logs.
- `lastMessageAt` updating.
- ticks appearing.
- candles updating by minute.
- degraded health if the provider is unreachable.

## Quality Gates

Required:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Targeted gates during development:

```bash
npm -w @rtctp/domain run build
npm -w @rtctp/api run typecheck
npm -w @rtctp/api run test -- market-data
```

Performance gate:

- Fixture playback local processing target: under 2ms per inbound tick for parser plus enqueue.
- Batch worker duration must be logged or measured in stress test.
- Stress test must assert memory-bounded queue behavior, not just lack of crash.

## Exit Criteria

Milestone 4 is done when:

- API can start in `disabled`, `fixture`, and `live` market data modes.
- Fixture replay deterministically produces stored ticks and one-minute candles.
- Live Coinbase mode receives BTC/ETH market data when the provider is reachable.
- Provider failures are visible through logs and `/api/market/health`.
- Reconnect state machine is deterministic and tested.
- Ingestion queue is bounded and overflow counters are exact.
- Latest price cache is written to Redis and failures are non-fatal.
- REST endpoints return paginated tick and candle data.
- Parser, decimal preservation, queue overflow, reconnect, candle aggregation, fixture replay, and
  endpoint behavior have tests.
- `docs/api.md`, `docs/events.md`, `docs/data-model.md`, and troubleshooting runbook are updated.
- Quality gates pass or blockers are documented with exact failing command and owner.

## Risks And Mitigations

| Risk                                             | Mitigation                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Provider message shape changes                   | Keep raw fixtures and parser tests close to provider adapter.                                   |
| Provider downtime blocks development             | Fixture mode is first-class and is the default for tests.                                       |
| Socket callback blocks event loop                | Callback only parses and enqueues. Worker handles persistence and aggregation.                  |
| Local database grows too quickly                 | Enforce read caps first; add retention pruning if stress tests show growth risk.                |
| Duplicate trades inflate candles                 | Dedupe by provider, symbol, and trade ID where available.                                       |
| Late ticks rewrite old candles unexpectedly      | Keep a documented late-tick window and counter.                                                 |
| Redis unavailable                                | Continue DB-backed ingestion and expose Redis cache errors in health.                           |
| Binance fallback changes quote semantics         | Keep Coinbase primary; document any Binance `USDT` to internal `USD` mapping as prototype-only. |
| Milestone scope expands into UI/WebSocket fanout | Keep UI consumption hooks stable, but defer browser realtime delivery to Milestone 5.           |

## Reviewer Notes

The strongest review signal in this milestone is not the WebSocket connection itself. It is the
combination of:

- deterministic fixtures,
- bounded queues,
- precise decimal string handling,
- explicit provider health,
- tested reconnect behavior,
- durable recent data,
- documented late/duplicate policies.

Those pieces make later matching, realtime fanout, admin observability, and performance milestones
credible instead of fragile.
