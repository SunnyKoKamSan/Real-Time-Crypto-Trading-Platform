import { and, eq, sql } from 'drizzle-orm';
import { ASSETS, type Asset, type AssetBalance } from '@rtctp/domain';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { type NewLedgerEntry, ledgerEntries } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export async function appendLedgerEntry(client: RepositoryClient, entry: NewLedgerEntry) {
  const rows = await runRepositoryQuery(client.insert(ledgerEntries).values(entry).returning());
  return firstOrThrow(rows, 'ledger insert returned no rows');
}

export async function listLedgerEntriesForUserAsset(
  client: RepositoryClient,
  userId: string,
  asset: Asset,
) {
  return runRepositoryQuery(
    client
      .select()
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.userId, userId), eq(ledgerEntries.asset, asset)))
      .orderBy(ledgerEntries.createdAt, ledgerEntries.id),
  );
}

export async function getLedgerBalance(
  client: RepositoryClient,
  userId: string,
  asset: Asset,
): Promise<string> {
  const rows = await runRepositoryQuery(
    client
      .select({
        balance: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)::numeric(20, 8)`,
      })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.userId, userId), eq(ledgerEntries.asset, asset))),
  );

  return rows[0]?.balance ?? '0.00000000';
}

export async function getLedgerBalances(
  client: RepositoryClient,
  userId: string,
): Promise<AssetBalance[]> {
  return Promise.all(
    ASSETS.map(async (asset) => ({
      asset,
      balance: await getLedgerBalance(client, userId, asset),
    })),
  );
}

export async function seedDemoBalances(client: RepositoryClient, userId: string, referenceId: string) {
  const entries = [
    { asset: 'USD', amount: '100000.00000000' },
    { asset: 'BTC', amount: '1.00000000' },
    { asset: 'ETH', amount: '10.00000000' },
  ] as const;

  for (const entry of entries) {
    await appendLedgerEntry(client, {
      userId,
      asset: entry.asset,
      type: 'SYSTEM_MINT',
      amount: entry.amount,
      referenceType: 'DEMO_BALANCE_SEED',
      referenceId,
    });
  }
}
