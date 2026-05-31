# Local Development Runbook

## Start Infrastructure

```bash
npm run infra:up
```

PostgreSQL defaults to:

```text
postgres://trader:trader@localhost:5432/crypto_trading
```

Override with `DATABASE_URL` when needed.

## Migrate And Seed

```bash
npm run db:migrate
npm run db:seed
```

Generate a new migration after schema edits:

```bash
npm run db:generate
```

The seed is idempotent. It creates BTC/ETH symbols, admin/dev users, demo users, and initial paper balances through `ledger_entries` with `SYSTEM_MINT`.

## Test With PostgreSQL

Normal tests run without requiring a database. To run integration tests against a disposable database URL:

```bash
TEST_DATABASE_URL=postgres://trader:trader@localhost:5432/crypto_trading npm -w @rtctp/api run test
```

The integration tests reset the `public` schema for the configured `TEST_DATABASE_URL`.

## Reconstruct Balances

```sql
select user_id, asset, coalesce(sum(amount), 0)::numeric(20, 8) as balance
from ledger_entries
group by user_id, asset;
```

Ledger entries are historical facts. Do not update old rows to change a balance; append a compensating entry instead.
