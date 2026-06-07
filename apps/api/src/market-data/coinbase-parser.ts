import {
  marketTickReceivedSchema,
  tradingSymbolSchema,
  type MarketTickReceived,
  type TradingSymbol,
} from '@rtctp/domain';

export type CoinbaseParseResult =
  | { kind: 'ticks'; ticks: MarketTickReceived[]; ignored: number; duplicates: number }
  | { kind: 'heartbeat' }
  | { kind: 'ignored'; ignored: number }
  | { kind: 'error'; message: string };

interface CoinbaseTrade {
  trade_id?: unknown;
  product_id?: unknown;
  price?: unknown;
  size?: unknown;
  side?: unknown;
  time?: unknown;
}

export class CoinbaseMarketTradesParser {
  private readonly symbols: Set<TradingSymbol>;
  private readonly seenTradeIds = new Set<string>();

  constructor(symbols: TradingSymbol[]) {
    this.symbols = new Set(symbols);
  }

  parse(raw: string, receivedTimestamp = new Date().toISOString()): CoinbaseParseResult {
    let message: unknown;

    try {
      message = JSON.parse(raw);
    } catch {
      return { kind: 'error', message: 'Malformed Coinbase WebSocket JSON.' };
    }

    if (!isRecord(message)) {
      return { kind: 'error', message: 'Coinbase message must be an object.' };
    }

    if (message.channel === 'heartbeats') {
      return { kind: 'heartbeat' };
    }

    if (message.channel !== 'market_trades') {
      return { kind: 'ignored', ignored: 1 };
    }

    const events = Array.isArray(message.events) ? message.events : [];
    const ticks: MarketTickReceived[] = [];
    let ignored = 0;
    let duplicates = 0;

    for (const event of events) {
      if (!isRecord(event) || !Array.isArray(event.trades)) {
        ignored += 1;
        continue;
      }

      for (const trade of event.trades as CoinbaseTrade[]) {
        const parsed = this.parseTrade(trade, message.sequence_num, receivedTimestamp);

        if (parsed === 'ignored') {
          ignored += 1;
          continue;
        }

        if (parsed === 'duplicate') {
          duplicates += 1;
          continue;
        }

        if (parsed === 'invalid') {
          return { kind: 'error', message: 'Coinbase trade failed market tick validation.' };
        }

        ticks.push(parsed);
      }
    }

    if (ticks.length === 0) {
      return duplicates > 0
        ? { kind: 'ticks', ticks, ignored, duplicates }
        : { kind: 'ignored', ignored };
    }

    return { kind: 'ticks', ticks, ignored, duplicates };
  }

  private parseTrade(
    trade: CoinbaseTrade,
    providerSequence: unknown,
    receivedTimestamp: string,
  ): MarketTickReceived | 'ignored' | 'duplicate' | 'invalid' {
    if (!isRecord(trade)) {
      return 'ignored';
    }

    const symbolResult = tradingSymbolSchema.safeParse(trade.product_id);
    if (!symbolResult.success || !this.symbols.has(symbolResult.data)) {
      return 'ignored';
    }

    if (
      typeof trade.price !== 'string' ||
      typeof trade.size !== 'string' ||
      typeof trade.time !== 'string'
    ) {
      return 'invalid';
    }

    const tradeId = typeof trade.trade_id === 'string' ? trade.trade_id : undefined;
    if (tradeId && this.seenTradeIds.has(`${symbolResult.data}:${tradeId}`)) {
      return 'duplicate';
    }

    const tick = marketTickReceivedSchema.safeParse({
      type: 'MarketTickReceived',
      version: 1,
      symbol: symbolResult.data,
      price: trade.price,
      size: trade.size,
      providerTimestamp: trade.time,
      receivedTimestamp,
      provider: 'coinbase',
      providerSequence:
        typeof providerSequence === 'number' || typeof providerSequence === 'string'
          ? String(providerSequence)
          : undefined,
      tradeId,
    });

    if (!tick.success) {
      return 'invalid';
    }

    if (tradeId) {
      this.seenTradeIds.add(`${symbolResult.data}:${tradeId}`);
    }

    return tick.data;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
