import { and, desc, eq, gte, or, sql } from 'drizzle-orm';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { candles, type NewMarketTick, marketTicks } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export async function insertMarketTick(client: RepositoryClient, tick: NewMarketTick) {
  const rows = await runRepositoryQuery(
    client
      .insert(marketTicks)
      .values(tick)
      .onConflictDoNothing({
        target: [marketTicks.symbolId, marketTicks.source, marketTicks.tradeId],
        where: sql`${marketTicks.tradeId} is not null`,
      })
      .returning(),
  );
  return rows[0] ?? null;
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

export interface TickPageOptions {
  limit: number;
  cursor?: {
    observedAt: Date;
    id: string;
  };
  since?: Date;
}

export interface CandlePageOptions {
  interval: string;
  limit: number;
  cursor?: {
    timestamp: Date;
    id: string;
  };
}

export async function listMarketTicksPage(
  client: RepositoryClient,
  symbolId: string,
  options: TickPageOptions,
) {
  const conditions = [eq(marketTicks.symbolId, symbolId)];

  if (options.since) {
    conditions.push(gte(marketTicks.observedAt, options.since));
  }

  if (options.cursor) {
    conditions.push(
      or(
        sql`${marketTicks.observedAt} < ${options.cursor.observedAt}`,
        and(
          eq(marketTicks.observedAt, options.cursor.observedAt),
          sql`${marketTicks.id} < ${options.cursor.id}`,
        ),
      )!,
    );
  }

  return runRepositoryQuery(
    client
      .select()
      .from(marketTicks)
      .where(and(...conditions))
      .orderBy(desc(marketTicks.observedAt), desc(marketTicks.id))
      .limit(options.limit),
  );
}

export async function listCandlesPage(
  client: RepositoryClient,
  symbolId: string,
  options: CandlePageOptions,
) {
  const conditions = [eq(candles.symbolId, symbolId), eq(candles.interval, options.interval)];

  if (options.cursor) {
    conditions.push(
      or(
        sql`${candles.timestamp} < ${options.cursor.timestamp}`,
        and(
          eq(candles.timestamp, options.cursor.timestamp),
          sql`${candles.id} < ${options.cursor.id}`,
        ),
      )!,
    );
  }

  return runRepositoryQuery(
    client
      .select()
      .from(candles)
      .where(and(...conditions))
      .orderBy(desc(candles.timestamp), desc(candles.id))
      .limit(options.limit),
  );
}

export async function pruneMarketTicks(
  client: RepositoryClient,
  symbolId: string,
  retain: number,
): Promise<void> {
  await runRepositoryQuery(
    client.execute(sql`
      delete from ${marketTicks}
      where ${marketTicks.symbolId} = ${symbolId}
        and ${marketTicks.id} not in (
          select id from ${marketTicks}
          where ${marketTicks.symbolId} = ${symbolId}
          order by ${marketTicks.observedAt} desc, ${marketTicks.id} desc
          limit ${retain}
        )
    `),
  );
}

export async function pruneCandles(
  client: RepositoryClient,
  symbolId: string,
  interval: string,
  retain: number,
): Promise<void> {
  await runRepositoryQuery(
    client.execute(sql`
      delete from ${candles}
      where ${candles.symbolId} = ${symbolId}
        and ${candles.interval} = ${interval}
        and ${candles.id} not in (
          select id from ${candles}
          where ${candles.symbolId} = ${symbolId}
            and ${candles.interval} = ${interval}
          order by ${candles.timestamp} desc, ${candles.id} desc
          limit ${retain}
        )
    `),
  );
}

export type NewTick = NewMarketTick;
