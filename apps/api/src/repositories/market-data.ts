import { and, eq, gte } from 'drizzle-orm';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { candles, type NewMarketTick, marketTicks } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export async function insertMarketTick(client: RepositoryClient, tick: NewMarketTick) {
  const rows = await runRepositoryQuery(client.insert(marketTicks).values(tick).returning());
  return firstOrThrow(rows, 'market tick insert returned no rows');
}

export async function listMarketTicksSince(
  client: RepositoryClient,
  symbolId: string,
  since: Date,
) {
  return runRepositoryQuery(
    client
      .select()
      .from(marketTicks)
      .where(and(eq(marketTicks.symbolId, symbolId), gte(marketTicks.observedAt, since)))
      .orderBy(marketTicks.observedAt),
  );
}

export async function upsertCandle(client: RepositoryClient, candle: typeof candles.$inferInsert) {
  const rows = await runRepositoryQuery(
    client
      .insert(candles)
      .values(candle)
      .onConflictDoUpdate({
        target: [candles.symbolId, candles.interval, candles.timestamp],
        set: {
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        },
      })
      .returning(),
  );

  return firstOrThrow(rows, 'candle upsert returned no rows');
}

export type NewTick = NewMarketTick;
