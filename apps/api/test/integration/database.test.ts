import { randomUUID } from 'node:crypto';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql as drizzleSql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createDatabase, type Database, withTransaction } from '../../src/db/client.js';
import { auditEvents, orders, sessions, symbols, users } from '../../src/db/schema.js';
import { setAuthRateLimitStore } from '../../src/auth/rate-limit.js';
import { MarketDataService } from '../../src/market-data/service.js';
import * as ledgerRepository from '../../src/repositories/ledger.js';
import { insertOutboxEvent, listPendingOutboxEvents } from '../../src/repositories/outbox.js';
import { createUser, findUserByEmail } from '../../src/repositories/users.js';
import { MemoryRateLimitStore } from '../../src/redis/rate-limit.js';
import { seedDatabase } from '../../src/scripts/seed.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeIntegration = databaseUrl ? describe : describe.skip;
const migrationsFolder = new URL('../../drizzle', import.meta.url).pathname;

async function resetDatabase(url: string) {
  const sql = postgres(url, { max: 1, prepare: false });
  await sql`drop schema if exists public cascade`;
  await sql`drop schema if exists drizzle cascade`;
  await sql`create schema public`;
  await sql.end();
}

async function countRows(db: Database, tableName: string): Promise<number> {
  const rows = await db.execute(
    drizzleSql<{
      count: number;
    }>`select count(*)::int as count from ${drizzleSql.identifier(tableName)}`,
  );
  return rows[0]?.count ?? 0;
}

describeIntegration('database foundation', () => {
  let db: Database;
  let sql: postgres.Sql;

  beforeEach(async () => {
    await resetDatabase(databaseUrl);
    const database = createDatabase(databaseUrl);
    db = database.db;
    sql = database.sql;
    await migrate(db, { migrationsFolder });
    setAuthRateLimitStore(new MemoryRateLimitStore());
  });

  afterEach(async () => {
    setAuthRateLimitStore(null);
    await sql.end();
  });

  it('migrates an empty database to the latest schema', async () => {
    expect(await countRows(db, 'users')).toBe(0);
    expect(await countRows(db, 'symbols')).toBe(0);
  });

  it('runs the seed script idempotently', async () => {
    await seedDatabase(db);
    await seedDatabase(db);

    expect(await countRows(db, 'users')).toBe(4);
    expect(await countRows(db, 'symbols')).toBe(2);
    expect(await countRows(db, 'ledger_entries')).toBe(8);

    const alice = await findUserByEmail(db, 'demo.alice@rtctp.local');
    expect(alice).not.toBeNull();
    expect(await ledgerRepository.getLedgerBalance(db, alice?.id ?? '', 'USD')).toBe(
      '100000.00000000',
    );
  });

  it('rolls back all writes when a transaction fails', async () => {
    await expect(
      withTransaction(async (tx) => {
        const user = await createUser(tx, {
          id: randomUUID(),
          email: 'rollback@rtctp.local',
          displayName: 'Rollback',
          passwordHash:
            '$argon2id$v=19$m=19456,t=2,p=1$i4BiPmIA38LBtImHSjQ2jg$ISa8j23WmOaZu3tDS0iim6NZNlk8CjWVgp9vy45ZaGg',
        });

        await ledgerRepository.appendLedgerEntry(tx, {
          userId: user.id,
          asset: 'USD',
          type: 'SYSTEM_MINT',
          amount: '1.00000000',
          referenceType: 'SYSTEM_MINT',
          referenceId: randomUUID(),
        });

        throw new Error('force rollback');
      }, db),
    ).rejects.toThrow('force rollback');

    expect(await findUserByEmail(db, 'rollback@rtctp.local')).toBeNull();
  });

  it('rejects invalid order quantities and statuses', async () => {
    await seedDatabase(db);
    const [user] = await db.select().from(users).limit(1);
    const [symbol] = await db.select().from(symbols).limit(1);

    await expect(
      db.insert(orders).values({
        userId: user?.id ?? '',
        symbolId: symbol?.id ?? '',
        side: 'BUY',
        type: 'LIMIT',
        status: 'OPEN',
        price: '10.00000000',
        quantity: '0.00000000',
        filledQuantity: '0.00000000',
        remainingQuantity: '0.00000000',
      }),
    ).rejects.toThrow();

    await expect(
      db.execute(
        drizzleSql`insert into orders (user_id, symbol_id, side, type, status, price, quantity, filled_quantity, remaining_quantity)
          values (${user?.id}, ${symbol?.id}, 'BUY', 'LIMIT', 'BROKEN', '10.00000000', '1.00000000', '0.00000000', '1.00000000')`,
      ),
    ).rejects.toThrow();
  });

  it('rejects filled quantities greater than order quantity', async () => {
    await seedDatabase(db);
    const [user] = await db.select().from(users).limit(1);
    const [symbol] = await db.select().from(symbols).limit(1);

    await expect(
      db.insert(orders).values({
        userId: user?.id ?? '',
        symbolId: symbol?.id ?? '',
        side: 'SELL',
        type: 'LIMIT',
        status: 'PARTIALLY_FILLED',
        price: '10.00000000',
        quantity: '1.00000000',
        filledQuantity: '2.00000000',
        remainingQuantity: '0.00000000',
      }),
    ).rejects.toThrow();
  });

  it('keeps ledger repository APIs append-only', async () => {
    expect(Object.keys(ledgerRepository).sort()).toEqual([
      'appendLedgerEntry',
      'getLedgerBalance',
      'getLedgerBalances',
      'listLedgerEntriesForUserAsset',
      'seedDemoBalances',
    ]);
  });

  it('replays market ticks into DB-backed tick and candle endpoints', async () => {
    await seedDatabase(db);
    const service = new MarketDataService({
      database: db,
      config: {
        mode: 'disabled',
        provider: 'coinbase',
        symbols: ['BTC-USD', 'ETH-USD'],
        fixturePath: 'unused',
        replaySpeed: 1,
        queueCapacity: 10,
        tickRetentionPerSymbol: 100,
        candleRetentionPerSymbol: 100,
        reconnectBaseMs: 250,
        reconnectMaxMs: 30_000,
        reconnectJitterRatio: 0,
        healthStaleMs: 15_000,
      },
    });
    await service.start();

    service.processRawMessageForTest(
      JSON.stringify({
        channel: 'market_trades',
        sequence_num: 1,
        events: [
          {
            trades: [
              {
                trade_id: 'integration-1',
                product_id: 'BTC-USD',
                price: '65000.00000000',
                size: '0.10000000',
                side: 'BUY',
                time: '2026-06-07T00:00:01.000Z',
              },
              {
                trade_id: 'integration-2',
                product_id: 'BTC-USD',
                price: '65010.00000000',
                size: '0.20000000',
                side: 'SELL',
                time: '2026-06-07T00:00:20.000Z',
              },
            ],
          },
        ],
      }),
    );
    await service.drainForTest();

    const app = createApp({
      database: db,
      getMarketHealth: () => service.getHealthSnapshot(),
    });

    const ticks = await request(app).get('/api/market/BTC-USD/ticks?limit=10').expect(200);
    expect(ticks.body.data.ticks.map((tick: { tradeId: string }) => tick.tradeId)).toEqual([
      'integration-2',
      'integration-1',
    ]);
    expect(ticks.body.data.page).toEqual({ limit: 10, nextCursor: null });

    const candleResponse = await request(app)
      .get('/api/market/BTC-USD/candles?interval=1m&limit=10')
      .expect(200);
    expect(candleResponse.body.data.candles[0]).toMatchObject({
      symbol: 'BTC-USD',
      interval: '1m',
      intervalStart: '2026-06-07T00:00:00.000Z',
      intervalEnd: '2026-06-07T00:01:00.000Z',
      open: '65000.00000000',
      high: '65010.00000000',
      low: '65000.00000000',
      close: '65010.00000000',
      volume: '0.30000000',
    });

    const health = await request(app).get('/api/market/health').expect(200);
    expect(health.body.data.parser.parsed).toBe(2);
    expect(health.body.data.candles.updated).toBe(2);
    expect(health.body.data.cache.errors).toBeGreaterThanOrEqual(0);

    expect(await countRows(db, 'market_ticks')).toBe(2);
    expect(await countRows(db, 'candles')).toBe(1);
    await service.stop();
  });

  it('validates market endpoint symbols and limits before querying', async () => {
    const app = createApp({
      database: db,
      getMarketHealth: () =>
        ({
          mode: 'disabled',
          provider: 'coinbase',
          state: 'disabled',
          symbols: ['BTC-USD', 'ETH-USD'],
          startedAt: null,
          connectedAt: null,
          lastMessageAt: null,
          lastHeartbeatAt: null,
          lastErrorAt: null,
          lastError: null,
          reconnectCount: 0,
          queue: { capacity: 1, length: 0, enqueued: 0, dequeued: 0, dropped: 0 },
          parser: { parsed: 0, ignored: 0, errors: 0, duplicates: 0 },
          candles: { updated: 0, lateAccepted: 0, tooLateRejected: 0 },
          cache: { latestPriceWrites: 0, errors: 0 },
        }) as const,
    });

    const badSymbol = await request(app).get('/api/market/DOGE-USD/ticks').expect(400);
    expect(badSymbol.body.error.code).toBe('VALIDATION_ERROR');

    const badLimit = await request(app).get('/api/market/BTC-USD/ticks?limit=1000').expect(400);
    expect(badLimit.body.error.message).toContain('limit');
  });

  it('rejects ledger entries with ambiguous signed semantics', async () => {
    await seedDatabase(db);
    const [user] = await db.select().from(users).limit(1);

    await expect(
      ledgerRepository.appendLedgerEntry(db, {
        userId: user?.id ?? '',
        asset: 'USD',
        type: 'FEE',
        amount: '1.00000000',
        referenceType: 'TEST_FEE',
        referenceId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'CONSTRAINT_VIOLATION' });

    await expect(
      ledgerRepository.appendLedgerEntry(db, {
        userId: user?.id ?? '',
        asset: 'USD',
        type: 'SYSTEM_MINT',
        amount: '-1.00000000',
        referenceType: 'SYSTEM_MINT',
        referenceId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'CONSTRAINT_VIOLATION' });
  });

  it('inserts outbox rows inside a caller transaction', async () => {
    const eventId = randomUUID();
    const correlationId = randomUUID();

    await withTransaction(async (tx) => {
      await insertOutboxEvent(tx, {
        eventId,
        eventType: 'ledger.seeded',
        payloadVersion: 1,
        aggregateType: 'ledger',
        aggregateId: 'seed',
        partitionKey: 'seed',
        occurredAt: new Date().toISOString(),
        correlationId,
        payload: { seeded: true },
      });
    }, db);

    const pending = await listPendingOutboxEvents(db, 10);
    expect(pending.map((event) => event.id)).toContain(eventId);
  });

  it('reconstructs balances from historical ledger rows', async () => {
    await seedDatabase(db);
    const alice = await findUserByEmail(db, 'demo.alice@rtctp.local');
    const entries = await ledgerRepository.listLedgerEntriesForUserAsset(
      db,
      alice?.id ?? '',
      'USD',
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.amount).toBe('100000.00000000');
    expect(await ledgerRepository.getLedgerBalance(db, alice?.id ?? '', 'USD')).toBe(
      '100000.00000000',
    );
  });

  it('registers a user with a refresh cookie, audit event, and ledger-derived balances', async () => {
    const response = await request(createApp())
      .post('/api/auth/register')
      .send({
        email: 'New.User@rtctp.local',
        displayName: 'New User',
        password: 'LongEnoughPassword!2026',
      })
      .expect(200);

    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.body.data.user).toMatchObject({
      email: 'new.user@rtctp.local',
      displayName: 'New User',
      role: 'USER',
    });
    expect(response.body.data.auth.accessToken).toBeTypeOf('string');
    expect(response.body.data.auth.session.csrfToken).toBeTypeOf('string');
    expect(response.body.data.balances).toEqual([
      { asset: 'BTC', balance: '1.00000000' },
      { asset: 'ETH', balance: '10.00000000' },
      { asset: 'USD', balance: '100000.00000000' },
    ]);

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('refreshToken');
    expect(body).not.toContain('refreshTokenHash');

    const [user] = await db
      .select()
      .from(users)
      .where(drizzleSql`${users.email} = 'new.user@rtctp.local'`);
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await countRows(db, 'sessions')).toBe(1);

    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(drizzleSql`${auditEvents.type} = 'AUTH_USER_REGISTERED'`);
    expect(audit?.payload).toMatchObject({ userId: user?.id });
  });

  it('rejects duplicate registration with a safe error', async () => {
    const app = createApp();
    const payload = {
      email: 'dupe@rtctp.local',
      displayName: 'Dupe',
      password: 'LongEnoughPassword!2026',
    };

    await request(app).post('/api/auth/register').send(payload).expect(200);
    const response = await request(app).post('/api/auth/register').send(payload).expect(409);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Registration could not be completed with those details.',
    });
  });

  it('logs in with generic wrong-password failure and returns /api/me with a bearer token', async () => {
    await seedDatabase(db);

    const failure = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'demo.alice@rtctp.local', password: 'wrong-password' })
      .expect(401);

    expect(failure.body.error).toMatchObject({
      code: 'AUTH_REQUIRED',
      message: 'Invalid email or password.',
    });

    const login = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'demo.alice@rtctp.local', password: 'LocalDemoPassword!2026' })
      .expect(200);

    await request(createApp()).get('/api/me').expect(401);

    const me = await request(createApp())
      .get('/api/me')
      .set('Authorization', `Bearer ${login.body.data.auth.accessToken}`)
      .expect(200);

    expect(me.body.data.user.email).toBe('demo.alice@rtctp.local');
    expect(me.body.data.balances).toContainEqual({
      asset: 'USD',
      balance: '100000.00000000',
    });
  });

  it('rotates refresh cookies, detects old-token replay, and revokes the token family', async () => {
    const agent = request.agent(createApp());
    const register = await agent
      .post('/api/auth/register')
      .send({
        email: 'rotate@rtctp.local',
        displayName: 'Rotate User',
        password: 'LongEnoughPassword!2026',
      })
      .expect(200);
    const firstCookie = register.headers['set-cookie']?.[0]?.split(';')[0] ?? '';
    const firstCsrf = register.body.data.auth.session.csrfToken;

    const refresh = await agent
      .post('/api/auth/refresh')
      .set('x-csrf-token', firstCsrf)
      .expect(200);
    const secondCsrf = refresh.body.data.auth.session.csrfToken;

    expect(secondCsrf).not.toBe(firstCsrf);
    expect(await countRows(db, 'sessions')).toBe(2);

    await request(createApp())
      .post('/api/auth/refresh')
      .set('Cookie', firstCookie)
      .set('x-csrf-token', firstCsrf)
      .expect(401);

    const replayEvents = await db
      .select()
      .from(auditEvents)
      .where(drizzleSql`${auditEvents.type} = 'AUTH_REFRESH_REPLAY_DETECTED'`);
    expect(replayEvents).toHaveLength(1);

    const sessionRows = await db.select().from(sessions);
    expect(sessionRows.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it('logs out idempotently and clears the refresh cookie', async () => {
    const agent = request.agent(createApp());
    const register = await agent
      .post('/api/auth/register')
      .send({
        email: 'logout@rtctp.local',
        displayName: 'Logout User',
        password: 'LongEnoughPassword!2026',
      })
      .expect(200);

    const logout = await agent
      .post('/api/auth/logout')
      .set('x-csrf-token', register.body.data.auth.session.csrfToken)
      .expect(200);

    expect(logout.headers['set-cookie']?.[0]).toContain('rtctp_refresh=;');
    expect(logout.body.data).toEqual({ loggedOut: true });
    expect((await db.select().from(sessions))[0]?.revokedReason).toBe('LOGOUT');

    await agent.post('/api/auth/logout').expect(200);
  });

  it('rate limits auth endpoints with standard headers', async () => {
    const app = createApp();

    for (let index = 0; index < 8; index += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@rtctp.local', password: 'wrong-password' })
        .expect(401);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@rtctp.local', password: 'wrong-password' })
      .expect(429);

    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers['x-ratelimit-limit']).toBe('8');
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
    expect(blocked.headers['x-ratelimit-reset']).toBeTypeOf('string');
  });
});
