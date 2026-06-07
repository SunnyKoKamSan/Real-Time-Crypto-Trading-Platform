import { randomUUID } from 'node:crypto';
import type { MarketProviderHealthDto, MarketTickReceived, TradingSymbol } from '@rtctp/domain';
import type { Database } from '../db/client.js';
import { db as defaultDb } from '../db/client.js';
import { getRedisClient } from '../redis/client.js';
import {
  insertMarketTick,
  pruneCandles,
  pruneMarketTicks,
  upsertCandle,
} from '../repositories/market-data.js';
import { findSymbolByCode, upsertSymbol } from '../repositories/symbols.js';
import { logger } from '../logger.js';
import { OneMinuteCandleAggregator } from './candles.js';
import { CoinbaseMarketDataAdapter } from './coinbase-adapter.js';
import { CoinbaseMarketTradesParser } from './coinbase-parser.js';
import { getMarketDataConfig } from './config.js';
import { FixtureMarketDataAdapter } from './fixture-adapter.js';
import { MarketHealthTracker } from './health.js';
import { BoundedRingQueue } from './queue.js';
import type { MarketDataAdapter, MarketDataConfig } from './types.js';

export interface MarketDataServiceOptions {
  config?: MarketDataConfig;
  database?: Database;
}

export class MarketDataService {
  private readonly config: MarketDataConfig;
  private readonly database: Database;
  private readonly parser: CoinbaseMarketTradesParser;
  private readonly queue: BoundedRingQueue<MarketTickReceived>;
  private readonly health: MarketHealthTracker;
  private readonly aggregator = new OneMinuteCandleAggregator();
  private readonly symbolIds = new Map<TradingSymbol, string>();
  private adapter: MarketDataAdapter | null = null;
  private processing = false;
  private stopped = true;

  constructor(options: MarketDataServiceOptions = {}) {
    this.config = options.config ?? getMarketDataConfig();
    this.database = options.database ?? defaultDb;
    this.parser = new CoinbaseMarketTradesParser(this.config.symbols);
    this.queue = new BoundedRingQueue(this.config.queueCapacity);
    this.health = new MarketHealthTracker(this.config);
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.health.markStarted();

    if (this.config.mode === 'disabled') {
      return;
    }

    try {
      await this.ensureSymbols();
    } catch (error) {
      this.health.markDisconnected(error);
      logger.warn({ err: error }, 'market data symbol initialization failed');
    }

    this.adapter =
      this.config.mode === 'fixture'
        ? new FixtureMarketDataAdapter(
            this.config.fixturePath,
            this.config.replaySpeed,
            (raw) => this.handleRawMessage(raw),
            (error) => {
              this.health.markDisconnected(error);
              logger.warn({ err: error }, 'market data fixture replay failed');
            },
            () => this.health.markDisconnected(),
          )
        : new CoinbaseMarketDataAdapter(
            this.config,
            (raw) => this.handleRawMessage(raw),
            () => this.health.markConnected(),
            (error) => this.health.markReconnect(error),
            (error) => this.health.markDisconnected(error),
          );

    try {
      await this.adapter.start();
      if (this.config.mode === 'fixture') {
        this.health.markConnected();
      }
    } catch (error) {
      this.health.markDisconnected(error);
      logger.warn({ err: error }, 'market data adapter failed to start');
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    await this.adapter?.stop();
    this.adapter = null;
    this.health.markDisconnected();
  }

  getHealthSnapshot(): MarketProviderHealthDto {
    return this.health.snapshot(this.queue.snapshot());
  }

  processRawMessageForTest(raw: string): void {
    this.handleRawMessage(raw);
  }

  async drainForTest(): Promise<void> {
    while (this.processing || this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  private handleRawMessage(raw: string): void {
    const result = this.parser.parse(raw);

    if (result.kind === 'heartbeat') {
      this.health.markHeartbeat();
      return;
    }

    if (result.kind === 'error') {
      this.health.incrementParser('errors');
      this.health.markError(result.message);
      return;
    }

    if (result.kind === 'ignored') {
      this.health.incrementParser('ignored', result.ignored);
      return;
    }

    this.health.markMessage();
    this.health.incrementParser('parsed', result.ticks.length);
    this.health.incrementParser('ignored', result.ignored);
    this.health.incrementParser('duplicates', result.duplicates);

    for (const tick of result.ticks) {
      this.queue.enqueue(tick);
    }

    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      while (!this.stopped) {
        const tick = this.queue.dequeue();
        if (!tick) {
          return;
        }

        await this.processTick(tick);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processTick(tick: MarketTickReceived): Promise<void> {
    try {
      const symbolId = await this.getSymbolId(tick.symbol);
      const inserted = await insertMarketTick(this.database, {
        symbolId,
        price: tick.price,
        size: tick.size,
        source: tick.provider,
        providerSequence: tick.providerSequence,
        tradeId: tick.tradeId,
        observedAt: new Date(tick.providerTimestamp),
        receivedAt: new Date(tick.receivedTimestamp),
      });

      if (!inserted) {
        this.health.incrementParser('duplicates');
        return;
      }

      await this.writeLatestPrice(tick);
      await pruneMarketTicks(this.database, symbolId, this.config.tickRetentionPerSymbol);

      const result = this.aggregator.apply(tick);
      if (result.status === 'too_late') {
        this.health.incrementCandles('tooLateRejected');
        return;
      }

      if (result.status === 'duplicate') {
        this.health.incrementParser('duplicates');
        return;
      }

      await upsertCandle(this.database, {
        symbolId,
        interval: result.candle.interval,
        timestamp: result.candle.timestamp,
        open: result.candle.open,
        high: result.candle.high,
        low: result.candle.low,
        close: result.candle.close,
        volume: result.candle.volume,
      });
      await pruneCandles(
        this.database,
        symbolId,
        result.candle.interval,
        this.config.candleRetentionPerSymbol,
      );
      this.health.incrementCandles('updated');
      if (result.late) {
        this.health.incrementCandles('lateAccepted');
      }
    } catch (error) {
      this.health.markError(error);
      logger.warn({ err: error, symbol: tick.symbol }, 'market data tick processing failed');
    }
  }

  private async getSymbolId(symbol: TradingSymbol): Promise<string> {
    const cached = this.symbolIds.get(symbol);
    if (cached) {
      return cached;
    }

    const row = await this.ensureSymbol(symbol);
    this.symbolIds.set(symbol, row.id);
    return row.id;
  }

  private async ensureSymbols(): Promise<void> {
    for (const symbol of this.config.symbols) {
      await this.getSymbolId(symbol);
    }
  }

  private async ensureSymbol(symbol: TradingSymbol) {
    const existing = await findSymbolByCode(this.database, symbol);
    if (existing) {
      return existing;
    }

    const [baseAsset, quoteAsset] = symbol.split('-') as ['BTC' | 'ETH', 'USD'];
    return upsertSymbol(this.database, {
      id: randomUUID(),
      code: symbol,
      baseAsset,
      quoteAsset,
      priceScale: 8,
      quantityScale: 8,
      isActive: 1,
    });
  }

  private async writeLatestPrice(tick: MarketTickReceived): Promise<void> {
    try {
      const redis = getRedisClient();
      if (redis.status === 'wait') {
        await redis.connect();
      }
      await redis.set(
        `market:latest:${tick.symbol}`,
        JSON.stringify({
          symbol: tick.symbol,
          price: tick.price,
          size: tick.size,
          providerTimestamp: tick.providerTimestamp,
          receivedTimestamp: tick.receivedTimestamp,
          provider: tick.provider,
          tradeId: tick.tradeId,
        }),
      );
      this.health.incrementCache('latestPriceWrites');
    } catch (error) {
      this.health.incrementCache('errors');
      logger.warn({ err: error, symbol: tick.symbol }, 'market latest price cache write failed');
    }
  }
}

export const marketDataService = new MarketDataService();
