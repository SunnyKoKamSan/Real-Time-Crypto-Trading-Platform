import { eq } from 'drizzle-orm';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { type NewSymbol, symbols } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export async function upsertSymbol(client: RepositoryClient, symbol: NewSymbol) {
  const rows = await runRepositoryQuery(
    client
      .insert(symbols)
      .values(symbol)
      .onConflictDoUpdate({
        target: symbols.code,
        set: {
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          priceScale: symbol.priceScale,
          quantityScale: symbol.quantityScale,
          isActive: symbol.isActive,
        },
      })
      .returning(),
  );

  return firstOrThrow(rows, 'symbol upsert returned no rows');
}

export async function findSymbolByCode(client: RepositoryClient, code: string) {
  const rows = await runRepositoryQuery(
    client.select().from(symbols).where(eq(symbols.code, code)).limit(1),
  );
  return rows[0] ?? null;
}

export async function listSymbols(client: RepositoryClient) {
  return runRepositoryQuery(client.select().from(symbols).orderBy(symbols.code));
}
