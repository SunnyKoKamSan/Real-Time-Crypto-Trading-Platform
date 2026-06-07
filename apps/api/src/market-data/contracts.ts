import type { MarketCandleInterval, TradingSymbol } from '@rtctp/domain';

export const supportedMarketSymbols = ['BTC-USD', 'ETH-USD'] as const satisfies TradingSymbol[];
export const supportedCandleIntervals = ['1m'] as const satisfies MarketCandleInterval[];

const supportedMarketSymbolSet = new Set<string>(supportedMarketSymbols);
const supportedCandleIntervalSet = new Set<string>(supportedCandleIntervals);
const financialDecimalPattern = /^-?(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;

export function isSupportedMarketSymbol(value: unknown): value is TradingSymbol {
  return typeof value === 'string' && supportedMarketSymbolSet.has(value);
}

export function isSupportedCandleInterval(value: unknown): value is MarketCandleInterval {
  return typeof value === 'string' && supportedCandleIntervalSet.has(value);
}

export function isFinancialDecimalString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() === value && financialDecimalPattern.test(value);
}

export function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
