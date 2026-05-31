import { randomUUID } from 'node:crypto';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql as drizzleSql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database, withTransaction } from '../../src/db/client.js';
import { orders, symbols, users } from '../../src/db/schema.js';
import * as ledgerRepository from '../../src/repositories/ledger.js';
import { insertOutboxEvent, listPendingOutboxEvents } from '../../src/repositories/outbox.js';
import { createUser, findUserByEmail } from '../../src/repositories/users.js';
import { seedDatabase } from '../../src/scripts/seed.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeIntegration = databaseUrl ? describe : describe.skip;
const migrationsFolder = new URL('../../drizzle', import.meta.url).pathname;

async function resetDatabase(url: string) {
  const sql = postgres(url, { max: 1, prepare: false });
  await sql`drop schema if exists public cascade`;
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
  });

  afterEach(async () => {
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
      'listLedgerEntriesForUserAsset',
    ]);
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
});
