import { Decimal } from 'decimal.js';
import type { MarketCandleInterval, MarketTickReceived } from '@rtctp/domain';

export interface AggregatedCandle {
  symbol: MarketTickReceived['symbol'];
  interval: MarketCandleInterval;
  timestamp: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export type CandleAggregationResult =
  | { status: 'updated'; candle: AggregatedCandle; late: boolean }
  | { status: 'too_late' }
  | { status: 'duplicate' };

interface CandleState {
  symbol: MarketTickReceived['symbol'];
  minuteMs: number;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: Decimal;
  openAtMs: number;
  closeAtMs: number;
  tradeIds: Set<string>;
}

export class OneMinuteCandleAggregator {
  private readonly candles = new Map<string, CandleState>();
  private readonly latestTickMsBySymbol = new Map<string, number>();

  constructor(private readonly maxLateMs = 60_000) {}

  apply(tick: MarketTickReceived): CandleAggregationResult {
    const tickMs = Date.parse(tick.providerTimestamp);
    if (Number.isNaN(tickMs)) {
      return { status: 'too_late' };
    }

    const latest = this.latestTickMsBySymbol.get(tick.symbol);
    const late = latest !== undefined && tickMs < latest;
    if (latest !== undefined && tickMs < latest - this.maxLateMs) {
      return { status: 'too_late' };
    }

    this.latestTickMsBySymbol.set(tick.symbol, Math.max(latest ?? tickMs, tickMs));

    const minuteMs = Math.floor(tickMs / 60_000) * 60_000;
    const key = `${tick.symbol}:${minuteMs}`;
    const tradeKey = tick.tradeId ? `${tick.provider}:${tick.tradeId}` : undefined;
    const state = this.candles.get(key);

    if (state && tradeKey && state.tradeIds.has(tradeKey)) {
      return { status: 'duplicate' };
    }

    const price = new Decimal(tick.price);
    const size = new Decimal(tick.size);
    const nextState =
      state ??
      ({
        symbol: tick.symbol,
        minuteMs,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: new Decimal(0),
        openAtMs: tickMs,
        closeAtMs: tickMs,
        tradeIds: new Set<string>(),
      } satisfies CandleState);

    if (tickMs < nextState.openAtMs) {
      nextState.open = price;
      nextState.openAtMs = tickMs;
    }

    if (tickMs >= nextState.closeAtMs) {
      nextState.close = price;
      nextState.closeAtMs = tickMs;
    }

    nextState.high = Decimal.max(nextState.high, price);
    nextState.low = Decimal.min(nextState.low, price);
    nextState.volume = nextState.volume.plus(size);
    if (tradeKey) {
      nextState.tradeIds.add(tradeKey);
    }

    this.candles.set(key, nextState);
    return {
      status: 'updated',
      candle: mapStateToCandle(nextState),
      late,
    };
  }
}

function mapStateToCandle(state: CandleState): AggregatedCandle {
  return {
    symbol: state.symbol,
    interval: '1m',
    timestamp: new Date(state.minuteMs),
    open: state.open.toFixed(8),
    high: state.high.toFixed(8),
    low: state.low.toFixed(8),
    close: state.close.toFixed(8),
    volume: state.volume.toFixed(8),
  };
}
