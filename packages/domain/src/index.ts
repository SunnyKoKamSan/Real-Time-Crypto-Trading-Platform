import { z } from 'zod';

export const SUPPORTED_SYMBOLS = ['BTC-USD', 'ETH-USD'] as const;

export const orderSideSchema = z.enum(['BUY', 'SELL']);
export const orderTypeSchema = z.enum(['MARKET', 'LIMIT']);
export const orderStatusSchema = z.enum([
  'PENDING',
  'OPEN',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELLED',
  'REJECTED',
]);
export const tradingSymbolSchema = z.enum(SUPPORTED_SYMBOLS);

export type OrderSide = z.infer<typeof orderSideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type TradingSymbol = z.infer<typeof tradingSymbolSchema>;

export interface HealthResponse {
  service: string;
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

export interface MarketTick {
  symbol: TradingSymbol;
  price: string;
  source: 'coinbase' | 'binance' | 'system';
  receivedAt: string;
}

export function isSupportedSymbol(value: string): value is TradingSymbol {
  return SUPPORTED_SYMBOLS.includes(value as TradingSymbol);
}

