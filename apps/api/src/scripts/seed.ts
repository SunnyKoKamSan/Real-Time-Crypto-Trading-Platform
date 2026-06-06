import { pathToFileURL } from 'node:url';
import { env } from '../config/env.js';
import { db, queryClient, withTransaction } from '../db/client.js';
import type { Database } from '../db/client.js';
import { ledgerEntries, users } from '../db/schema.js';
import { hashPassword } from '../auth/password.js';
import { upsertSymbol } from '../repositories/symbols.js';

const ids = {
  admin: '00000000-0000-4000-8000-000000000001',
  dev: '00000000-0000-4000-8000-000000000002',
  alice: '00000000-0000-4000-8000-000000000003',
  bob: '00000000-0000-4000-8000-000000000004',
  btcUsd: '10000000-0000-4000-8000-000000000001',
  ethUsd: '10000000-0000-4000-8000-000000000002',
  systemMint: '90000000-0000-4000-8000-000000000001',
};

const seedUsers = [
  { id: ids.admin, email: 'admin@rtctp.local', displayName: 'Admin', role: 'ADMIN' },
  { id: ids.dev, email: 'dev@rtctp.local', displayName: 'Developer', role: 'ADMIN' },
  { id: ids.alice, email: 'demo.alice@rtctp.local', displayName: 'Demo Alice', role: 'USER' },
  { id: ids.bob, email: 'demo.bob@rtctp.local', displayName: 'Demo Bob', role: 'USER' },
] as const;

const seedLedgerEntries = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    userId: ids.admin,
    asset: 'USD',
    amount: '100000.00000000',
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    userId: ids.dev,
    asset: 'USD',
    amount: '100000.00000000',
  },
  {
    id: '30000000-0000-4000-8000-000000000003',
    userId: ids.alice,
    asset: 'USD',
    amount: '100000.00000000',
  },
  {
    id: '30000000-0000-4000-8000-000000000004',
    userId: ids.alice,
    asset: 'BTC',
    amount: '1.00000000',
  },
  {
    id: '30000000-0000-4000-8000-000000000005',
    userId: ids.alice,
    asset: 'ETH',
    amount: '10.00000000',
  },
  {
    id: '30000000-0000-4000-8000-000000000006',
    userId: ids.bob,
    asset: 'USD',
    amount: '100000.00000000',
  },
  {
    id: '30000000-0000-4000-8000-000000000007',
    userId: ids.bob,
    asset: 'BTC',
    amount: '1.00000000',
  },
  {
    id: '30000000-0000-4000-8000-000000000008',
    userId: ids.bob,
    asset: 'ETH',
    amount: '10.00000000',
  },
] as const;

export async function seedDatabase(client: Database = db): Promise<void> {
  const passwordHash = await hashPassword(env.SEED_DEMO_PASSWORD);

  await withTransaction(async (tx) => {
    await upsertSymbol(tx, {
      id: ids.btcUsd,
      code: 'BTC-USD',
      baseAsset: 'BTC',
      quoteAsset: 'USD',
      priceScale: 8,
      quantityScale: 8,
      isActive: 1,
    });

    await upsertSymbol(tx, {
      id: ids.ethUsd,
      code: 'ETH-USD',
      baseAsset: 'ETH',
      quoteAsset: 'USD',
      priceScale: 8,
      quantityScale: 8,
      isActive: 1,
    });

    for (const user of seedUsers) {
      await tx
        .insert(users)
        .values({ ...user, passwordHash })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            displayName: user.displayName,
            passwordHash,
            role: user.role,
            updatedAt: new Date(),
          },
        });
    }

    for (const entry of seedLedgerEntries) {
      await tx
        .insert(ledgerEntries)
        .values({
          ...entry,
          type: 'SYSTEM_MINT',
          referenceType: 'SYSTEM_MINT',
          referenceId: ids.systemMint,
        })
        .onConflictDoNothing({
          target: ledgerEntries.id,
        });
    }
  }, client);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedDatabase();
  await queryClient.end();
}
