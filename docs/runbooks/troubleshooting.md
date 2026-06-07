# Troubleshooting Runbook

## Port Already In Use

Check the process using the port:

```bash
lsof -i :4000
lsof -i :5173
```

Stop the old process or start the service on another port where supported.

## Docker Services Do Not Become Healthy

Inspect service status and logs:

```bash
docker compose ps
docker compose logs postgres
docker compose logs redis
docker compose logs redpanda
```

Common fixes:

- Confirm Docker Desktop is running.
- Free ports `5432`, `6379`, `9092`, `9090`, `3000`, and `16686`.
- Reset local volumes only when losing local data is acceptable: `docker compose down -v`.

## API Rejects Browser Requests

Confirm `WEB_ORIGIN` in `.env` matches the Vite URL. The default API CORS origin is:

```bash
WEB_ORIGIN=http://localhost:5173
```

The web dev server currently binds to `127.0.0.1`. If needed, update `WEB_ORIGIN` to match the exact
browser origin being used.

## TypeScript Cannot Resolve Workspace Packages

Reinstall from the repository root:

```bash
npm install
npm run typecheck
```

Workspace packages are expected to be installed through npm workspaces, not by running package-level
installs.

## Build Artifacts Appear In Git Status

Generated folders such as `dist`, `coverage`, `.vite`, and `node_modules` should stay ignored. If
tracked artifacts appear, remove them from the index rather than committing generated output.

## Market Data Does Not Start

Check mode and provider settings:

```bash
MARKET_DATA_MODE=fixture npm run dev:api
MARKET_DATA_MODE=live MARKET_DATA_PROVIDER=coinbase npm run dev:api
curl http://localhost:4000/api/market/health
```

Expected local setup before fixture or live ingestion:

```bash
npm run infra:up
npm run db:migrate
npm run db:seed
```

Useful checks:

```bash
curl http://localhost:4000/api/symbols
curl 'http://localhost:4000/api/market/BTC-USD/ticks?limit=10'
curl 'http://localhost:4000/api/market/BTC-USD/candles?interval=1m&limit=10'
```

If `/api/market/health` shows `cache.errors` increasing, Redis is unavailable or refusing writes.
This is non-fatal for REST reads because PostgreSQL remains the source for ticks and candles.

If `state` is `reconnecting` in live mode, the API is running but the Coinbase WebSocket is not
currently connected. Check network access and provider reachability. Fixture mode does not require
internet access.

If queue `dropped` increases, inbound messages exceeded `MARKET_DATA_QUEUE_CAPACITY`. The queue uses
`drop_oldest` to cap memory. Increase capacity only after checking local memory and ingestion lag.

## PostgreSQL Integration Tests Are Skipped

The integration suite intentionally skips DB-resetting tests unless `TEST_DATABASE_URL` is set:

```bash
TEST_DATABASE_URL=postgres://trader:trader@localhost:5432/crypto_trading npm -w @rtctp/api run test
```

The tests drop and recreate the target schema, so use a disposable local database.
