import type { MarketProviderHealthDto } from '@rtctp/domain';
import type { QueueSnapshot } from './queue.js';
import type {
  CacheCounters,
  CandleCounters,
  MarketDataConfig,
  ParserCounters,
  ProviderRuntimeState,
} from './types.js';

export class MarketHealthTracker {
  private runtime: ProviderRuntimeState;
  private parser: ParserCounters = { parsed: 0, ignored: 0, errors: 0, duplicates: 0 };
  private candles: CandleCounters = { updated: 0, lateAccepted: 0, tooLateRejected: 0 };
  private cache: CacheCounters = { latestPriceWrites: 0, errors: 0 };

  constructor(private readonly config: MarketDataConfig) {
    this.runtime = {
      state: config.mode === 'disabled' ? 'disabled' : 'disconnected',
      startedAt: null,
      connectedAt: null,
      lastMessageAt: null,
      lastHeartbeatAt: null,
      lastErrorAt: null,
      lastError: null,
      reconnectCount: 0,
    };
  }

  markStarted(): void {
    this.runtime.startedAt = new Date().toISOString();
    this.runtime.state = this.config.mode === 'disabled' ? 'disabled' : 'connecting';
  }

  markConnected(): void {
    const now = new Date().toISOString();
    this.runtime.state = 'connected';
    this.runtime.connectedAt = now;
    this.runtime.lastMessageAt = now;
  }

  markMessage(): void {
    this.runtime.lastMessageAt = new Date().toISOString();
  }

  markHeartbeat(): void {
    const now = new Date().toISOString();
    this.runtime.lastHeartbeatAt = now;
    this.runtime.lastMessageAt = now;
  }

  markReconnect(error?: unknown): void {
    this.runtime.state = 'reconnecting';
    this.runtime.reconnectCount += 1;
    if (error) {
      this.markError(error);
    }
  }

  markDisconnected(error?: unknown): void {
    this.runtime.state = this.config.mode === 'disabled' ? 'disabled' : 'disconnected';
    if (error) {
      this.markError(error);
    }
  }

  markError(error: unknown): void {
    this.runtime.lastErrorAt = new Date().toISOString();
    this.runtime.lastError = error instanceof Error ? error.message : String(error);
  }

  incrementParser(counter: keyof ParserCounters, by = 1): void {
    this.parser[counter] += by;
  }

  incrementCandles(counter: keyof CandleCounters, by = 1): void {
    this.candles[counter] += by;
  }

  incrementCache(counter: keyof CacheCounters, by = 1): void {
    this.cache[counter] += by;
  }

  snapshot(queue: QueueSnapshot, now = new Date()): MarketProviderHealthDto {
    const stale =
      this.runtime.state === 'connected' &&
      this.runtime.lastMessageAt !== null &&
      now.getTime() - new Date(this.runtime.lastMessageAt).getTime() > this.config.healthStaleMs;

    return {
      mode: this.config.mode,
      provider: this.config.provider,
      state: stale ? 'degraded' : this.runtime.state,
      symbols: this.config.symbols,
      startedAt: this.runtime.startedAt,
      connectedAt: this.runtime.connectedAt,
      lastMessageAt: this.runtime.lastMessageAt,
      lastHeartbeatAt: this.runtime.lastHeartbeatAt,
      lastErrorAt: this.runtime.lastErrorAt,
      lastError: this.runtime.lastError,
      reconnectCount: this.runtime.reconnectCount,
      queue,
      parser: { ...this.parser },
      candles: { ...this.candles },
      cache: { ...this.cache },
    };
  }
}
