import { tradingSymbolSchema, type TradingSymbol } from '@rtctp/domain';
import { env } from '../config/env.js';
import type { MarketDataConfig } from './types.js';

export function parseMarketDataSymbols(value: string): TradingSymbol[] {
  const symbols = value
    .split(',')
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    throw new Error('MARKET_DATA_SYMBOLS must include at least one symbol');
  }

  return symbols.map((symbol) => tradingSymbolSchema.parse(symbol));
}

export function getMarketDataConfig(): MarketDataConfig {
  return {
    mode: env.MARKET_DATA_MODE,
    provider: env.MARKET_DATA_PROVIDER,
    symbols: parseMarketDataSymbols(env.MARKET_DATA_SYMBOLS),
    fixturePath: env.MARKET_DATA_FIXTURE_PATH,
    replaySpeed: env.MARKET_DATA_REPLAY_SPEED,
    queueCapacity: env.MARKET_DATA_QUEUE_CAPACITY,
    tickRetentionPerSymbol: env.MARKET_DATA_TICK_RETENTION_PER_SYMBOL,
    candleRetentionPerSymbol: env.MARKET_DATA_CANDLE_RETENTION_PER_SYMBOL,
    reconnectBaseMs: env.MARKET_DATA_RECONNECT_BASE_MS,
    reconnectMaxMs: env.MARKET_DATA_RECONNECT_MAX_MS,
    reconnectJitterRatio: env.MARKET_DATA_RECONNECT_JITTER_RATIO,
    healthStaleMs: env.MARKET_DATA_HEALTH_STALE_MS,
  };
}
